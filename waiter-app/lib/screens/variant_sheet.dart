import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';

/// Выбор официанта для блюда с размерами или модификаторами (вок — основа и соус, пицца — размер).
/// Правила групп — из iiko: обязательный минимум, максимум, бесплатные единицы. Цену считает сервер,
/// здесь — та же формула для показа: база (размер или блюдо) + платные единицы сверх бесплатных.
class Variant {
  Variant({required this.sizeId, required this.modifiers, required this.price, required this.text});
  final String? sizeId;
  final List<Map<String, dynamic>> modifiers; // [{id, groupId, amount, name}]
  final num price;
  final String text;
}

bool hasVariants(Map<String, dynamic> p) =>
    ((p['sizes'] as List?)?.length ?? 0) > 1 || ((p['modifierGroups'] as List?)?.isNotEmpty ?? false);

Future<Variant?> pickVariant(BuildContext context, Map<String, dynamic> p) {
  return showModalBottomSheet<Variant>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: C.bg,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => _VariantSheet(p: p),
  );
}

class _VariantSheet extends StatefulWidget {
  const _VariantSheet({required this.p});
  final Map<String, dynamic> p;
  @override
  State<_VariantSheet> createState() => _VariantSheetState();
}

class _VariantSheetState extends State<_VariantSheet> {
  late final List<Map<String, dynamic>> _sizes = [
    for (final z in (widget.p['sizes'] as List? ?? const [])) Map<String, dynamic>.from(z as Map),
  ];
  Map<String, dynamic>? _size;
  final Map<String, int> _mods = {}; // id → количество

  @override
  void initState() {
    super.initState();
    if (_sizes.length > 1) {
      _size = _sizes.firstWhere((z) => z['isDefault'] == true, orElse: () => _sizes.first);
    }
    _fillDefaults();
  }

  List<Map<String, dynamic>> get _groups {
    final raw = _size != null ? (_size!['groups'] as List? ?? const []) : (widget.p['modifierGroups'] as List? ?? const []);
    return [for (final g in raw) Map<String, dynamic>.from(g as Map)];
  }

  List<Map<String, dynamic>> _items(Map<String, dynamic> g) => [
    for (final m in (g['items'] as List? ?? const [])) Map<String, dynamic>.from(m as Map),
  ];

  int _n(Object? v) => (v as num?)?.toInt() ?? 0;

  int _total(Map<String, dynamic> g) => _items(g).fold(0, (s, m) => s + (_mods[m['id'].toString()] ?? 0));

  /// Как у гостя: варианты по умолчанию из iiko в пределах максимума; обязательный минимум — самыми дешёвыми
  void _fillDefaults() {
    _mods.clear();
    for (final g in _groups) {
      final max = _n(g['max']);
      var total = 0;
      for (final m in _items(g).where((m) => _n(m['def']) > 0)) {
        if (max > 0 && total + _n(m['def']) > max) break;
        _mods[m['id'].toString()] = _n(m['def']);
        total += _n(m['def']);
      }
      final min = _n(g['min']);
      if (total < min) {
        final cheap = _items(g)..sort((a, b) => ((a['price'] as num?) ?? 0).compareTo((b['price'] as num?) ?? 0));
        for (final m in cheap) {
          if (total >= min) break;
          final id = m['id'].toString();
          if (_mods.containsKey(id)) continue;
          _mods[id] = 1;
          total += 1;
        }
      }
    }
  }

  void _tap(Map<String, dynamic> g, Map<String, dynamic> m) {
    final id = m['id'].toString();
    final max = _n(g['max']);
    setState(() {
      if (max == 1) {
        // Один вариант в группе: выбор заменяет прежний (обязательную группу пустой не оставляем)
        final on = (_mods[id] ?? 0) > 0;
        for (final x in _items(g)) {
          _mods.remove(x['id'].toString());
        }
        if (!on || _n(g['min']) > 0) _mods[id] = 1;
        return;
      }
      if ((_mods[id] ?? 0) > 0) {
        _mods.remove(id);
      } else if (max == 0 || _total(g) < max) {
        _mods[id] = 1;
      } else {
        toast(context, 'В «${g['name']}» можно выбрать не больше $max');
      }
    });
  }

  num get _price {
    final base = _size != null ? ((_size!['price'] as num?) ?? 0) : ((widget.p['basePrice'] as num?) ?? (widget.p['price'] as num?) ?? 0);
    num extra = 0;
    for (final g in _groups) {
      final units = <num>[];
      for (final m in _items(g)) {
        final q = _mods[m['id'].toString()] ?? 0;
        for (var i = 0; i < q; i++) {
          units.add((m['price'] as num?) ?? 0);
        }
      }
      units.sort();
      final free = _n(g['free']).clamp(0, units.length);
      extra += units.skip(free).fold<num>(0, (s, v) => s + v);
    }
    return base + extra;
  }

  List<String> get _missing => [for (final g in _groups) if (_total(g) < _n(g['min'])) g['name'].toString()];

  String _rule(Map<String, dynamic> g) {
    final min = _n(g['min']);
    final max = _n(g['max']);
    return [
      min > 0 && max == 1 ? 'выберите 1' : (min > 0 ? 'минимум $min' : 'по желанию'),
      if (max > 1) 'до $max',
    ].join(' · ');
  }

  void _done() {
    final mods = <Map<String, dynamic>>[];
    final names = <String>[];
    for (final g in _groups) {
      for (final m in _items(g)) {
        final q = _mods[m['id'].toString()] ?? 0;
        if (q <= 0) continue;
        mods.add({'id': m['id'].toString(), 'groupId': g['id'], 'amount': q, 'name': m['name']});
        names.add(q > 1 ? '${m['name']} ×$q' : m['name'].toString());
      }
    }
    Navigator.of(context).pop(Variant(
      sizeId: _size?['id']?.toString(),
      modifiers: mods,
      price: _price,
      text: [if (_size != null) _size!['name'].toString(), ...names].join(', '),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final missing = _missing;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: .8,
      maxChildSize: .95,
      builder: (context, scroll) => Column(
        children: [
          Expanded(
            child: ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: C.line, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 14),
                Text(widget.p['name'].toString(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                if (_sizes.length > 1) ...[
                  const SizedBox(height: 18),
                  const Text('Размер', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final z in _sizes)
                        ChoiceChip(
                          label: Text('${z['name']} · ${rub((z['price'] as num?) ?? 0)}'),
                          selected: identical(z, _size),
                          onSelected: (_) => setState(() {
                            _size = z;
                            _fillDefaults();
                          }),
                        ),
                    ],
                  ),
                ],
                for (final g in _groups) ...[
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: Text(g['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      ),
                      Text(
                        _rule(g),
                        style: TextStyle(
                          color: _total(g) < _n(g['min']) ? C.danger : C.muted,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final m in _items(g))
                        FilterChip(
                          label: Text(
                            ((m['price'] as num?) ?? 0) > 0 ? '${m['name']} +${rub(m['price'] as num)}' : m['name'].toString(),
                          ),
                          selected: (_mods[m['id'].toString()] ?? 0) > 0,
                          onSelected: (_) => _tap(g, m),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: missing.isEmpty ? _done : null,
                  child: Text(missing.isEmpty ? 'Добавить · ${rub(_price)}' : 'Выберите: ${missing.join(', ')}'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
