import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../push.dart';
import '../theme.dart';
import 'login.dart';
import 'notifications.dart';
import 'table.dart';

/// Схема зала: все столы ресторана плитками с состоянием, суммой и таймером.
class HallScreen extends StatefulWidget {
  const HallScreen({super.key});
  @override
  State<HallScreen> createState() => _HallScreenState();
}

class _HallScreenState extends State<HallScreen> with WidgetsBindingObserver {
  List<Map<String, dynamic>> _tables = [];
  bool _pushEnabled = false;
  String? _error;
  bool _loading = true;
  String _filter = 'all';
  int _tab = 0;
  int _unread = 0;
  Timer? _timer;
  final _subs = <StreamSubscription>[];
  final _notifKey = GlobalKey<NotificationsViewState>();
  Set<String> _alerted = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _load(silent: true));
    _subs.add(
      Push.I.onForeground.listen((m) {
        Push.signal(m.data['type']);
        _load(silent: true);
        _notifKey.currentState?.reload();
        if (!mounted) return;
        final sessionId = m.data['sessionId'];
        showPushBanner(
          context,
          title: m.notification?.title ?? 'Уведомление',
          body: m.notification?.body,
          onTap: (sessionId ?? '').isEmpty ? null : () => _openSession(sessionId!, m.data['tableNumber'] ?? ''),
        );
      }),
    );
    _subs.add(Push.I.onOpened.listen(_openFromPush));
    final pending = Push.I.pendingOpen;
    if (pending != null) {
      Push.I.pendingOpen = null;
      WidgetsBinding.instance.addPostFrameCallback((_) => _openFromPush(pending));
    }
    Push.I.registerDevice();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load(silent: true);
  }

  void _openFromPush(Map<String, dynamic> data) {
    final id = (data['sessionId'] ?? '').toString();
    if (id.isNotEmpty) _openSession(id, (data['tableNumber'] ?? '').toString());
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final d = await Api.I.get('/api/v1/waiter/hall') as Map;
      final notes = await Api.I.get('/api/v1/waiter/notifications?unread=1') as List;
      final tables = List<Map<String, dynamic>>.from(d['tables'] as List);
      // Без push — сигнал внутри приложения, когда стол начинает ждать официанта или блюдо готово
      final alertNow = tables
          .where((t) => t['tone'] == 'waiting' || t['tone'] == 'ready' || t['tone'] == 'bill')
          .map((t) => '${t['number']}:${t['tone']}:${t['readyCount']}')
          .toSet();
      if (!_loading && !_pushEnabled && alertNow.difference(_alerted).isNotEmpty) Push.signal('dish_ready');
      _alerted = alertNow;
      if (!mounted) return;
      setState(() {
        _tables = tables;
        _pushEnabled = d['pushEnabled'] == true && Push.I.available;
        _unread = notes.length;
        _error = null;
        _loading = false;
      });
    } on ApiError catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _openSession(String sessionId, String number) async {
    HapticFeedback.selectionClick();
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TableScreen(sessionId: sessionId, tableNumber: number),
      ),
    );
    _load(silent: true);
  }

  Future<void> _tapTable(Map<String, dynamic> t) async {
    final number = t['number'].toString();
    if (t['sessionId'] != null) return _openSession(t['sessionId'].toString(), number);
    HapticFeedback.selectionClick();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      showDragHandle: true,
      backgroundColor: C.bg,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Стол $number', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              const Text(
                'Стол свободен. Откройте его, чтобы принять заказ у гостей без QR-кода.',
                style: TextStyle(color: C.muted, fontSize: 15),
              ),
              const SizedBox(height: 20),
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Открыть стол')),
            ],
          ),
        ),
      ),
    );
    if (ok != true || !mounted) return;
    try {
      final s = await Api.I.post('/api/v1/waiter/tables/${Uri.encodeComponent(number)}/open') as Map;
      if (!mounted) return;
      await _openSession(s['sessionId'].toString(), number);
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message);
    }
  }

  List<Map<String, dynamic>> get _visible => switch (_filter) {
    'mine' => _tables.where((t) => t['mine'] == true).toList(),
    'busy' => _tables.where((t) => t['tone'] != 'free').toList(),
    'wait' => _tables.where((t) => ['waiting', 'ready', 'bill'].contains(t['tone'])).toList(),
    _ => _tables,
  };

  int get _attention => _tables.where((t) => ['waiting', 'ready', 'bill'].contains(t['tone'])).length;

  void _menu() {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      backgroundColor: C.bg,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: Text(Api.I.staffName ?? 'Официант'),
              subtitle: Text(Api.I.restaurantName ?? ''),
            ),
            ListTile(
              leading: Icon(_pushEnabled ? Icons.notifications_active_outlined : Icons.notifications_off_outlined),
              title: Text(_pushEnabled ? 'Push-уведомления включены' : 'Push выключены'),
              subtitle: Text(
                _pushEnabled
                    ? 'Придут, даже когда приложение закрыто'
                    : 'Уведомления приходят, пока приложение открыто',
              ),
            ),
            ListTile(
              leading: const Icon(Icons.refresh),
              title: const Text('Обновить меню'),
              onTap: () async {
                Navigator.pop(ctx);
                try {
                  await Api.I.catalog(force: true);
                  if (mounted) toast(context, 'Меню обновлено');
                } on ApiError catch (e) {
                  if (mounted) toast(context, e.message);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout, color: C.danger),
              title: const Text('Выйти', style: TextStyle(color: C.danger)),
              onTap: () async {
                await Push.I.unregister();
                await Api.I.logout();
                if (!ctx.mounted) return;
                Navigator.of(ctx)
                    .pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const PinScreen()), (_) => false);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_tab == 0 ? 'Зал' : 'Уведомления'),
            Text(
              Api.I.restaurantName ?? '',
              style: const TextStyle(fontSize: 13, color: C.muted, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          if (_tab == 1)
            TextButton(
              onPressed: () async {
                await _notifKey.currentState?.readAll();
                _load(silent: true);
              },
              child: const Text('Прочитать все'),
            ),
          IconButton(onPressed: _menu, icon: const Icon(Icons.account_circle_outlined)),
          const SizedBox(width: 8),
        ],
      ),
      body: IndexedStack(
        index: _tab,
        children: [
          _hall(),
          NotificationsView(
            key: _notifKey,
            onOpen: (id, n) => _openSession(id, n),
            onChanged: () => _load(silent: true),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        backgroundColor: Colors.white,
        indicatorColor: C.bg,
        height: 68,
        onDestinationSelected: (i) {
          HapticFeedback.selectionClick();
          setState(() => _tab = i);
          if (i == 1) _notifKey.currentState?.reload();
        },
        destinations: [
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _attention > 0,
              label: Text('$_attention'),
              child: const Icon(Icons.table_restaurant_outlined),
            ),
            selectedIcon: const Icon(Icons.table_restaurant),
            label: 'Зал',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _unread > 0,
              label: Text('$_unread'),
              child: const Icon(Icons.notifications_none),
            ),
            selectedIcon: const Icon(Icons.notifications),
            label: 'Уведомления',
          ),
        ],
      ),
    );
  }

  Widget _hall() {
    if (_loading && _tables.isEmpty) return const Center(child: CircularProgressIndicator());
    final list = _visible;
    final waitCount = _attention;
    return RefreshIndicator(
      onRefresh: () => _load(silent: true),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: SizedBox(
              height: 52,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                children: [
                  _chip('all', 'Все', _tables.length),
                  _chip('busy', 'Занятые', _tables.where((t) => t['tone'] != 'free').length),
                  _chip('wait', 'Ждут', waitCount, alert: waitCount > 0),
                  _chip('mine', 'Мои', _tables.where((t) => t['mine'] == true).length),
                ],
              ),
            ),
          ),
          if (_error != null)
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                padding: const EdgeInsets.all(12),
                decoration: cardBox(color: const Color(0xFFFCE6E9), r: 14),
                child: Text(_error!, style: const TextStyle(color: C.danger)),
              ),
            ),
          if (list.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Text('Здесь пока пусто', style: TextStyle(color: C.muted)),
              ),
            ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 130,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 0.74,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, i) => _TableTile(t: list[i], onTap: () => _tapTable(list[i])),
                childCount: list.length,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String key, String label, int count, {bool alert = false}) {
    final on = _filter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        selected: on,
        showCheckmark: false,
        onSelected: (_) {
          HapticFeedback.selectionClick();
          setState(() => _filter = key);
        },
        label: Text('$label · $count'),
        labelStyle: TextStyle(color: on ? Colors.white : (alert ? C.danger : C.ink), fontWeight: FontWeight.w600),
        selectedColor: C.ink,
        backgroundColor: Colors.white,
        side: BorderSide.none,
        shape: const StadiumBorder(),
      ),
    );
  }
}

class _TableTile extends StatelessWidget {
  const _TableTile({required this.t, required this.onTap});
  final Map<String, dynamic> t;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tone = Tone.of(t['tone'].toString());
    final free = t['tone'] == 'free';
    final guests = List<String>.from((t['guests'] as List?) ?? const []);
    final minutes = t['waitingMinutes'] as num?;
    final ready = (t['readyCount'] as num?) ?? 0;
    final pending = (t['pendingCount'] as num?) ?? 0;
    final accent = ['waiting', 'ready', 'bill'].contains(t['tone']);
    return Material(
      color: accent ? tone.bg : (free ? const Color(0xFFEFEEF4) : Colors.white),
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: accent ? tone.color.withValues(alpha: .5) : Colors.transparent, width: 1.5),
          ),
          padding: const EdgeInsets.all(11),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t['number'].toString(),
                    style: TextStyle(
                      fontSize: 28,
                      height: 1,
                      fontWeight: FontWeight.w800,
                      color: free ? C.muted : C.ink,
                    ),
                  ),
                  const Spacer(),
                  if (t['mine'] == true)
                    const Tooltip(
                      message: 'Ваш стол',
                      child: Icon(Icons.person, size: 18, color: C.ink),
                    ),
                ],
              ),
              const Spacer(),
              if (!free) ...[
                if (ready > 0)
                  _Pill(text: 'Готово · $ready', color: C.ok)
                else if (t['tone'] == 'waiting' || t['tone'] == 'bill')
                  _Pill(
                    text: minutes != null ? '${tone.label} · $minutes м' : tone.label,
                    color: tone.color,
                    blink: t['isOverdue'] == true,
                  )
                else if (pending > 0)
                  _Pill(text: 'Новые · $pending', color: C.warn),
                const SizedBox(height: 6),
                Text(
                  t['statusLabel'].toString(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, color: C.muted),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(Icons.people_alt_outlined, size: 15, color: C.muted),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        guests.isEmpty ? '${t['guestCount']}' : guests.join(', '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, color: C.muted),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(rub((t['total'] as num?) ?? 0), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ] else
                const Text('Свободен', style: TextStyle(color: C.muted)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatefulWidget {
  const _Pill({required this.text, required this.color, this.blink = false});
  final String text;
  final Color color;
  final bool blink;
  @override
  State<_Pill> createState() => _PillState();
}

class _PillState extends State<_Pill> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));

  @override
  void initState() {
    super.initState();
    if (widget.blink) _c.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(covariant _Pill old) {
    super.didUpdateWidget(old);
    if (widget.blink && !_c.isAnimating) _c.repeat(reverse: true);
    if (!widget.blink && _c.isAnimating) _c.value = 0;
    if (!widget.blink) _c.stop();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween(begin: 1.0, end: .45).animate(_c),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(color: widget.color, borderRadius: BorderRadius.circular(20)),
        child: Text(
          widget.text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
