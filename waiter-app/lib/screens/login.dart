import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../push.dart';
import '../theme.dart';
import 'hall.dart';

/// Первый запуск: к какому ресторану привязан телефон.
class RestaurantScreen extends StatefulWidget {
  const RestaurantScreen({super.key});
  @override
  State<RestaurantScreen> createState() => _RestaurantScreenState();
}

class _RestaurantScreenState extends State<RestaurantScreen> {
  late Future<List<Map<String, dynamic>>> _list = Api.I.restaurants();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _list,
          builder: (context, snap) {
            if (snap.hasError) {
              return _Retry(text: snap.error.toString(), onRetry: () => setState(() => _list = Api.I.restaurants()));
            }
            if (!snap.hasData) return const Center(child: CircularProgressIndicator());
            final list = snap.data!;
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 32, 20, 24),
              children: [
                const _Logo(),
                const SizedBox(height: 28),
                const Text(
                  'Ресторан',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: C.ink),
                ),
                const SizedBox(height: 4),
                const Text('Где вы работаете — телефон запомнит выбор', style: TextStyle(color: C.muted, fontSize: 15)),
                const SizedBox(height: 20),
                for (final r in list)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(20),
                        onTap: () async {
                          HapticFeedback.selectionClick();
                          await Api.I.setRestaurant(r['slug'].toString(), r['name'].toString());
                          if (!context.mounted) return;
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PinScreen()));
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(18),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      r['name'].toString(),
                                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: C.ink),
                                    ),
                                    if ((r['address'] ?? '').toString().isNotEmpty)
                                      Text(r['address'].toString(), style: const TextStyle(color: C.muted)),
                                  ],
                                ),
                              ),
                              const Icon(Icons.chevron_right, color: C.muted),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// Вход сотрудника зала. Режим iiko — код сотрудника из iiko (как в iikoWaiter): сервер проверяет, что сотрудник
/// есть в iiko, должность зальная и открыта смена на кассе, и открывает ту точку, где смена открыта.
/// Режим pin — PIN из админки (раздел «Сотрудники») в выбранном ресторане.
class PinScreen extends StatefulWidget {
  const PinScreen({super.key});
  @override
  State<PinScreen> createState() => _PinScreenState();
}

class _PinScreenState extends State<PinScreen> with SingleTickerProviderStateMixin {
  String _pin = '';
  late String? _error = Api.I.authLostReason;
  final bool _iiko = Api.I.iikoLogin;
  int get _maxLen => _iiko ? 16 : 6;
  bool _busy = false;
  late final AnimationController _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 380));

  @override
  void dispose() {
    _shake.dispose();
    super.dispose();
  }

  void _tap(String d) {
    if (_busy) return;
    HapticFeedback.lightImpact();
    setState(() {
      _error = null;
      if (d == '<') {
        if (_pin.isNotEmpty) _pin = _pin.substring(0, _pin.length - 1);
      } else if (_pin.length < _maxLen) {
        _pin += d;
      }
    });
  }

  Future<void> _submit({String? restaurant}) async {
    if (_pin.length < 4 || _busy) return;
    setState(() => _busy = true);
    try {
      await Api.I.pinLogin(_pin, restaurant: restaurant);
      Api.I.authLostReason = null;
      await Push.I.registerDevice();
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const HallScreen()), (_) => false);
    } on ApiError catch (e) {
      // Смена открыта сразу на нескольких точках — официант выбирает, где работает
      if (e.code == 'CHOOSE_RESTAURANT' && mounted) {
        final list = (e.details?['restaurants'] as List? ?? const []).cast<Map>();
        setState(() => _busy = false);
        final slug = await showModalBottomSheet<String>(
          context: context,
          showDragHandle: true,
          builder: (ctx) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Text('Где вы сейчас работаете?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                ),
                for (final r in list)
                  ListTile(
                    title: Text(r['name'].toString()),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.of(ctx).pop(r['slug'].toString()),
                  ),
              ],
            ),
          ),
        );
        if (slug != null) return _submit(restaurant: slug);
        return;
      }
      HapticFeedback.heavyImpact();
      _shake.forward(from: 0);
      setState(() {
        _error = e.message;
        _pin = '';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, box) {
            final key = (box.maxWidth - 40 - 32) / 3;
            final keySize = key.clamp(56.0, 84.0);
            return Column(
              children: [
                if (!_iiko)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () => Navigator.of(
                        context,
                      ).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const RestaurantScreen()), (_) => false),
                      icon: const Icon(Icons.storefront_outlined, size: 20),
                      label: Text(Api.I.restaurantName ?? 'Ресторан', overflow: TextOverflow.ellipsis),
                      style: TextButton.styleFrom(foregroundColor: C.muted),
                    ),
                  ),
                const Spacer(),
                const _Logo(),
                const SizedBox(height: 20),
                Text(
                  _iiko ? 'Код сотрудника iiko' : 'Введите PIN',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: C.ink),
                ),
                if (_iiko)
                  const Padding(
                    padding: EdgeInsets.fromLTRB(32, 6, 32, 0),
                    child: Text(
                      'Как на кассе. Смена должна быть открыта в iiko — приложение откроет вашу точку',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: C.muted, fontSize: 14),
                    ),
                  ),
                const SizedBox(height: 18),
                AnimatedBuilder(
                  animation: _shake,
                  builder: (context, child) {
                    final t = _shake.value;
                    final dx = t == 0 ? 0.0 : 10 * (1 - t) * (((t * 8).floor().isEven) ? 1 : -1);
                    return Transform.translate(offset: Offset(dx, 0), child: child);
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _pin.length > 4 ? _pin.length : 4,
                      (i) => AnimatedContainer(
                        duration: const Duration(milliseconds: 120),
                        margin: EdgeInsets.symmetric(horizontal: _pin.length > 8 ? 4 : 8),
                        width: _pin.length > 8 ? 12 : 16,
                        height: _pin.length > 8 ? 12 : 16,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: i < _pin.length ? (_error != null ? C.danger : C.ink) : Colors.transparent,
                          border: Border.all(color: _error != null ? C.danger : C.ink, width: 2),
                        ),
                      ),
                    ),
                  ),
                ),
                ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 36),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                    child: Center(
                      child: _busy
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : Text(
                              _error ?? '',
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: C.danger),
                            ),
                    ),
                  ),
                ),
                const Spacer(),
                for (final row in const [
                  ['1', '2', '3'],
                  ['4', '5', '6'],
                  ['7', '8', '9'],
                  ['<', '0', 'ok'],
                ])
                  Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        for (final d in row)
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: _PinKey(
                              label: d,
                              size: keySize,
                              enabled: d != 'ok' || _pin.length >= 4,
                              onTap: () => d == 'ok' ? _submit() : _tap(d),
                            ),
                          ),
                      ],
                    ),
                  ),
                const SizedBox(height: 12),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _PinKey extends StatelessWidget {
  const _PinKey({required this.label, required this.size, required this.onTap, this.enabled = true});
  final String label;
  final double size;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final isOk = label == 'ok';
    final Widget child = switch (label) {
      '<' => const Icon(Icons.backspace_outlined, color: C.ink),
      'ok' => Icon(Icons.arrow_forward, color: enabled ? Colors.white : C.muted),
      _ => Text(
        label,
        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w500, color: C.ink),
      ),
    };
    return Material(
      color: isOk ? (enabled ? C.ink : C.line) : (label == '<' ? Colors.transparent : Colors.white),
      shape: const CircleBorder(),
      elevation: 0,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: enabled ? onTap : null,
        child: SizedBox(
          width: size,
          height: size,
          child: Center(child: child),
        ),
      ),
    );
  }
}

class _Logo extends StatelessWidget {
  const _Logo();
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(color: C.ink, borderRadius: BorderRadius.circular(20)),
          child: const Icon(Icons.room_service_outlined, color: Colors.white, size: 32),
        ),
        const SizedBox(height: 8),
        const Text(
          'ФУДЖИ · ОФИЦИАНТ',
          style: TextStyle(letterSpacing: 2, fontWeight: FontWeight.w700, color: C.ink, fontSize: 12),
        ),
      ],
    );
  }
}

class _Retry extends StatelessWidget {
  const _Retry({required this.text, required this.onRetry});
  final String text;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off, size: 40, color: C.muted),
          const SizedBox(height: 12),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: C.muted),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: onRetry, child: const Text('Повторить')),
        ],
      ),
    ),
  );
}
