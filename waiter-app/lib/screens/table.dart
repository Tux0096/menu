import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../cart.dart';
import '../theme.dart';
import 'menu.dart';

const _courses = <int?>[null, 1, 2, 3];
String _courseLabel(int? c) => c == null ? 'сразу' : '$c';

/// Экран стола: гости, блюда по гостям и курсам, статусы кухни, «В работу», «Вынесено».
class TableScreen extends StatefulWidget {
  const TableScreen({super.key, required this.sessionId, required this.tableNumber});
  final String sessionId;
  final String tableNumber;
  @override
  State<TableScreen> createState() => _TableScreenState();
}

class _TableScreenState extends State<TableScreen> {
  final cart = TableCart();
  Map<String, dynamic>? _s;
  String? _error;
  bool _readOnly = false;
  bool _saving = false;
  bool _sending = false;
  bool _dirty = false;
  Timer? _debounce;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    cart.addListener(_onCartChanged);
    _open();
    _poll = Timer.periodic(const Duration(seconds: 4), (_) => _refresh());
    Api.I.catalog().catchError((_) => <String, dynamic>{});
  }

  @override
  void dispose() {
    _poll?.cancel();
    _debounce?.cancel();
    cart.removeListener(_onCartChanged);
    if (_dirty) _save();
    if (!_readOnly) Api.I.post('/api/v1/waiter/session/${widget.sessionId}/release').catchError((_) => null);
    super.dispose();
  }

  bool _applying = false;
  void _onCartChanged() {
    if (_applying) return;
    if (mounted) setState(() {});
    if (_readOnly) return;
    _dirty = true;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 700), _save);
  }

  void _apply(Map<String, dynamic> s) {
    _applying = true;
    cart.loadFrom(s);
    _applying = false;
    if (mounted) setState(() => _s = s);
  }

  Future<void> _open() async {
    try {
      _apply(Map<String, dynamic>.from(await Api.I.post('/api/v1/waiter/session/${widget.sessionId}/take') as Map));
    } on ApiError catch (e) {
      try {
        _readOnly = e.status == 409;
        _apply(Map<String, dynamic>.from(await Api.I.get('/api/v1/waiter/session/${widget.sessionId}') as Map));
        if (mounted && _readOnly) toast(context, e.message);
      } on ApiError catch (e2) {
        if (mounted) setState(() => _error = e2.message);
      }
    }
  }

  Future<void> _refresh() async {
    if (_dirty || _saving || _sending || _s == null) return;
    try {
      final s = Map<String, dynamic>.from(await Api.I.get('/api/v1/waiter/session/${widget.sessionId}') as Map);
      if (_dirty || _saving || !mounted) return;
      final newlyReady = ((s['readyCount'] as num?) ?? 0) > ((_s?['readyCount'] as num?) ?? 0);
      if (newlyReady) {
        HapticFeedback.heavyImpact();
        SystemSound.play(SystemSoundType.alert);
      }
      _apply(s);
    } catch (_) {}
  }

  Future<bool> _save() async {
    if (_readOnly || !_dirty) return true;
    if (_saving) {
      _debounce?.cancel();
      _debounce = Timer(const Duration(milliseconds: 400), _save);
      return false;
    }
    final version = cart.version;
    _saving = true;
    if (mounted) setState(() {});
    try {
      final s = Map<String, dynamic>.from(
        await Api.I.post('/api/v1/waiter/session/${widget.sessionId}/cart', cart.toBody()) as Map,
      );
      if (cart.version == version) {
        _dirty = false;
        if (mounted) _apply(s);
      }
      return true;
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message);
      return false;
    } finally {
      _saving = false;
      if (mounted) setState(() {});
    }
  }

  Future<void> _send() async {
    if (_sending) return;
    HapticFeedback.mediumImpact();
    setState(() => _sending = true);
    _debounce?.cancel();
    try {
      if (_dirty && !await _save()) return;
      final s = Map<String, dynamic>.from(
        await Api.I.post('/api/v1/waiter/session/${widget.sessionId}/send-to-production') as Map,
      );
      _apply(s);
      HapticFeedback.heavyImpact();
      if (mounted) {
        toast(context, s['iikoLastError'] != null ? 'Часть не ушла: ${s['iikoLastError']}' : 'Заказ отправлен в iiko');
      }
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _served([String? itemId]) async {
    HapticFeedback.mediumImpact();
    try {
      _apply(
        Map<String, dynamic>.from(
          await Api.I.post(
            '/api/v1/waiter/session/${widget.sessionId}/served',
            itemId == null
                ? {}
                : {
                    'itemIds': [itemId],
                  },
          ) as Map,
        ),
      );
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message);
    }
  }

  Future<void> _openMenu([int? seat]) async {
    HapticFeedback.selectionClick();
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MenuScreen(cart: cart, initialSeat: seat, tableNumber: widget.tableNumber),
      ),
    );
  }

  Future<void> _close() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Закрыть стол?'),
        content: const Text('Гость при следующем скане начнёт новый визит.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Отмена')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Закрыть')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await Api.I.post('/api/v1/waiter/session/${widget.sessionId}/close');
      if (mounted) Navigator.of(context).pop();
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = _s;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Стол ${s?['tableNumber'] ?? widget.tableNumber}'),
            if (s != null)
              Text(
                [s['workflowLabel'], if (_saving) 'сохраняем…' else if (_dirty) 'изменено'].join(' · '),
                style: const TextStyle(fontSize: 13, color: C.muted, fontWeight: FontWeight.w400),
              ),
          ],
        ),
        actions: [
          if (s?['paymentsEnabled'] == true)
            PopupMenuButton<String>(
              onSelected: (v) => v == 'close' ? _close() : null,
              itemBuilder: (_) => const [PopupMenuItem(value: 'close', child: Text('Закрыть стол'))],
            ),
        ],
      ),
      body: s == null
          ? Center(
              child: _error != null
                  ? Text(_error!, style: const TextStyle(color: C.muted))
                  : const CircularProgressIndicator(),
            )
          : _body(s),
      bottomNavigationBar: s == null || _readOnly ? null : _bottomBar(),
    );
  }

  Widget _body(Map<String, dynamic> s) {
    final ready = cart.items.where((i) => i['isReady'] == true).toList();
    final seats = cart.seats;
    final blocks = <int?>[...seats, null];
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          if (_readOnly) _banner(Icons.lock_outline, 'Стол редактирует другой официант — только просмотр', C.warn),
          if (s['iikoLastError'] != null) _banner(Icons.error_outline, s['iikoLastError'].toString(), C.danger),
          _summary(s),
          if (ready.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: cardBox(color: const Color(0xFFE3F5EC)),
              child: Row(
                children: [
                  const Icon(Icons.room_service, color: C.ok),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Готово к выносу: ${ready.fold<int>(0, (n, i) => n + ((i['quantity'] as num?)?.toInt() ?? 1))} поз.',
                      style: const TextStyle(fontWeight: FontWeight.w700, color: C.ink, fontSize: 16),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: C.ok, minimumSize: const Size(0, 40)),
                    onPressed: () => _served(),
                    child: const Text('Вынес всё'),
                  ),
                ],
              ),
            ),
          ],
          for (final seat in blocks) ..._seatBlock(seat),
        ],
      ),
    );
  }

  Widget _banner(IconData icon, String text, Color color) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(12),
    decoration: cardBox(color: color.withValues(alpha: .1), r: 14),
    child: Row(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 8),
        Expanded(
          child: Text(text, style: TextStyle(color: color)),
        ),
      ],
    ),
  );

  Widget _summary(Map<String, dynamic> s) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
      decoration: cardBox(),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Итого', style: TextStyle(color: C.muted, fontSize: 13)),
              Text(rub(cart.total), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            ],
          ),
          const Spacer(),
          const Icon(Icons.people_alt_outlined, color: C.muted, size: 20),
          const SizedBox(width: 4),
          _Stepper(
            value: cart.guestCount,
            enabled: !_readOnly,
            onMinus: cart.guestCount > [cart.guests.length, 1].reduce((a, b) => a > b ? a : b)
                ? () => cart.setGuestCount(cart.guestCount - 1)
                : null,
            onPlus: () => cart.setGuestCount(cart.guestCount + 1),
          ),
        ],
      ),
    );
  }

  List<Widget> _seatBlock(int? seat) {
    final list = cart.items.where((i) => TableCart.seatOf(i) == seat).toList();
    if (seat == null && list.isEmpty) return const [];
    final hasGuest = seat != null && cart.guests.any((g) => g['seat'] == seat);
    final sum = list.fold<num>(0, (s, i) => s + ((i['price'] as num?) ?? 0) * ((i['quantity'] as num?) ?? 0));
    return [
      const SizedBox(height: 18),
      Row(
        children: [
          CircleAvatar(
            radius: 15,
            backgroundColor: seat == null ? C.line : (hasGuest ? C.ink : Colors.white),
            child: Text(
              seat == null ? '·' : '$seat',
              style: TextStyle(
                color: seat != null && hasGuest ? Colors.white : C.ink,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(cart.seatName(seat), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          ),
          if (list.isNotEmpty) Text(rub(sum), style: const TextStyle(color: C.muted)),
          if (!_readOnly)
            IconButton(
              tooltip: 'Добавить блюдо',
              onPressed: () => _openMenu(seat),
              icon: const Icon(Icons.add_circle_outline),
            ),
        ],
      ),
      const SizedBox(height: 6),
      if (list.isEmpty)
        Padding(
          padding: const EdgeInsets.only(left: 40, bottom: 4),
          child: Text('Пока ничего', style: TextStyle(color: C.muted.withValues(alpha: .8))),
        )
      else
        Container(
          decoration: cardBox(),
          child: Column(
            children: [
              for (var i = 0; i < list.length; i++) ...[
                if (i > 0) const Divider(height: 1, indent: 14, endIndent: 14, color: C.line),
                _itemRow(list[i]),
              ],
            ],
          ),
        ),
    ];
  }

  Widget _itemRow(Map<String, dynamic> it) {
    final locked = it['isLocked'] == true;
    final served = it['servedAt'] != null;
    final ready = it['isReady'] == true;
    final qty = (it['quantity'] as num?)?.toInt() ?? 1;
    final course = (it['course'] as num?)?.toInt();
    final String status;
    final Color statusColor;
    if (!locked) {
      status = 'новое · не отправлено';
      statusColor = C.warn;
    } else if (served) {
      status = '✓ вынесено';
      statusColor = C.muted;
    } else if (ready) {
      status = 'готово — выносить';
      statusColor = C.ok;
    } else {
      status = (it['kitchenLabel'] ?? 'на кухне').toString();
      statusColor = C.violet;
    }
    final isBar = (it['source'] ?? 'main') != 'main';
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 10, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      it['name'].toString(),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: served ? C.muted : C.ink,
                        decoration: served ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text.rich(
                      TextSpan(
                        children: [
                          if (isBar)
                            const TextSpan(
                              text: 'бар · ',
                              style: TextStyle(color: C.violet),
                            ),
                          TextSpan(
                            text: status,
                            style: TextStyle(color: statusColor, fontWeight: FontWeight.w600),
                          ),
                          TextSpan(
                            text: ' · ${rub(it['price'] as num? ?? 0)}',
                            style: const TextStyle(color: C.muted),
                          ),
                        ],
                      ),
                      style: const TextStyle(fontSize: 13),
                    ),
                  ],
                ),
              ),
              if (!locked && !_readOnly)
                _Stepper(value: qty, onMinus: () => cart.setQty(it, qty - 1), onPlus: () => cart.setQty(it, qty + 1))
              else
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 2, right: 8),
                      child: Text('× $qty', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    ),
                    if (ready && !_readOnly)
                      _MiniChip(label: 'Вынес', on: true, color: C.ok, onTap: () => _served(it['id']?.toString())),
                  ],
                ),
            ],
          ),
          if (!_readOnly && !locked) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Text('Курс', style: TextStyle(color: C.muted, fontSize: 13)),
                const SizedBox(width: 6),
                for (final c in _courses)
                  Padding(
                    padding: const EdgeInsets.only(right: 4),
                    child: _MiniChip(
                      label: _courseLabel(c),
                      on: course == c,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        cart.setCourse(it, c);
                      },
                    ),
                  ),
                const Spacer(),
                _SeatButton(cart: cart, item: it),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _bottomBar() {
    final n = cart.pendingQty;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        decoration: const BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, -2))],
        ),
        child: Row(
          children: [
            OutlinedButton.icon(
              onPressed: () => _openMenu(),
              icon: const Icon(Icons.add),
              label: const Text('Блюдо'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 52),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                shape: const StadiumBorder(),
                foregroundColor: C.ink,
                side: const BorderSide(color: C.line, width: 1.5),
                textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton(
                onPressed: n == 0 || _sending ? null : _send,
                child: _sending
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                      )
                    : Text(
                        n == 0 ? 'Всё отправлено' : 'В работу · $n · ${rub(cart.pendingSum)}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({required this.value, this.onMinus, this.onPlus, this.enabled = true});
  final int value;
  final VoidCallback? onMinus;
  final VoidCallback? onPlus;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    Widget btn(IconData icon, VoidCallback? f) => SizedBox(
      width: 38,
      height: 38,
      child: IconButton(
        padding: EdgeInsets.zero,
        onPressed: enabled && f != null
            ? () {
                HapticFeedback.lightImpact();
                f();
              }
            : null,
        icon: Icon(icon, size: 20),
        style: IconButton.styleFrom(backgroundColor: C.bg),
      ),
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        btn(Icons.remove, onMinus),
        SizedBox(
          width: 32,
          child: Text(
            '$value',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        btn(Icons.add, onPlus),
      ],
    );
  }
}

class _MiniChip extends StatelessWidget {
  const _MiniChip({required this.label, required this.on, required this.onTap, this.color = C.ink});
  final String label;
  final bool on;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) => Material(
    color: on ? color : C.bg,
    borderRadius: BorderRadius.circular(16),
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minWidth: 34),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(color: on ? Colors.white : C.ink, fontWeight: FontWeight.w600, fontSize: 13),
        ),
      ),
    ),
  );
}

class _SeatButton extends StatelessWidget {
  const _SeatButton({required this.cart, required this.item});
  final TableCart cart;
  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    final seat = TableCart.seatOf(item);
    return PopupMenuButton<int>(
      tooltip: 'Кому',
      onSelected: (v) => cart.setSeat(item, v == 0 ? null : v),
      itemBuilder: (_) => [
        for (final n in cart.seats) PopupMenuItem(value: n, child: Text('$n · ${cart.seatName(n)}')),
        const PopupMenuItem(value: 0, child: Text('Без гостя')),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(color: C.bg, borderRadius: BorderRadius.circular(16)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.person_outline, size: 16, color: C.muted),
            const SizedBox(width: 4),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 90),
              child: Text(
                seat == null ? 'гость' : cart.seatName(seat),
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
