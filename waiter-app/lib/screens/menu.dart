import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../cart.dart';
import '../theme.dart';

/// Меню плитками: категории → блюда. Тап по плитке — +1 выбранному гостю.
class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key, required this.cart, required this.tableNumber, this.initialSeat});
  final TableCart cart;
  final String tableNumber;
  final int? initialSeat;
  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _Group {
  _Group(this.id, this.name);
  final String id;
  final String name;
  final products = <Map<String, dynamic>>[];
}

class _MenuScreenState extends State<MenuScreen> {
  late int? _seat = widget.initialSeat;
  List<_Group> _groups = [];
  _Group? _open;
  String _q = '';
  String? _error;
  bool _loading = true;
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    widget.cart.addListener(_changed);
    _load();
  }

  @override
  void dispose() {
    widget.cart.removeListener(_changed);
    _search.dispose();
    super.dispose();
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  Future<void> _load({bool force = false}) async {
    try {
      final c = await Api.I.catalog(force: force);
      final groupsById = <String, Map>{
        for (final g in (c['groups'] as List? ?? const [])) g['id'].toString(): g as Map,
      };
      final map = <String, _Group>{};
      for (final raw in (c['products'] as List? ?? const [])) {
        final p = Map<String, dynamic>.from(raw as Map);
        if (p['isPublished'] == false || ((p['price'] as num?) ?? 0) <= 0) continue;
        final gid = (p['parentGroup'] ?? 'other').toString();
        map.putIfAbsent(
          gid,
          () => _Group(gid, (groupsById[gid]?['name'] ?? p['parentGroupName'] ?? 'Другое').toString()),
        );
        map[gid]!.products.add(p);
      }
      final order = <String, int>{
        for (final g in groupsById.values) g['id'].toString(): (g['order'] as num?)?.toInt() ?? 0,
      };
      final list = map.values.toList()..sort((a, b) => (order[a.id] ?? 999).compareTo(order[b.id] ?? 999));
      for (final g in list) {
        g.products.sort((a, b) => ((a['order'] as num?) ?? 0).compareTo((b['order'] as num?) ?? 0));
      }
      if (!mounted) return;
      setState(() {
        _groups = list;
        _loading = false;
        _error = null;
      });
    } on ApiError catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get _found {
    final q = _q.trim().toLowerCase();
    return [
      for (final g in _groups)
        for (final p in g.products)
          if (p['name'].toString().toLowerCase().contains(q) || (p['sku'] ?? '').toString().toLowerCase().contains(q))
            p,
    ];
  }

  void _add(Map<String, dynamic> p) {
    if (p['isInStopList'] == true) {
      HapticFeedback.heavyImpact();
      toast(context, '«${p['name']}» в стоп-листе');
      return;
    }
    HapticFeedback.lightImpact();
    widget.cart.add(p, _seat);
  }

  void _remove(Map<String, dynamic> p) {
    HapticFeedback.selectionClick();
    widget.cart.remove(p['id'].toString(), _seat);
  }

  @override
  Widget build(BuildContext context) {
    final searching = _q.trim().isNotEmpty;
    final title = searching ? 'Поиск' : (_open?.name ?? 'Меню');
    return PopScope(
      canPop: _open == null || searching,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _open = null);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title),
              Text(
                'Стол ${widget.tableNumber}',
                style: const TextStyle(fontSize: 13, color: C.muted, fontWeight: FontWeight.w400),
              ),
            ],
          ),
        ),
        body: Column(
          children: [
            _seatBar(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
              child: TextField(
                controller: _search,
                onChanged: (v) => setState(() => _q = v),
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Название или артикул',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _q.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () {
                            _search.clear();
                            setState(() => _q = '');
                          },
                        ),
                ),
              ),
            ),
            Expanded(child: _content(searching)),
          ],
        ),
        bottomNavigationBar: _bottom(),
      ),
    );
  }

  Widget _seatBar() {
    final seats = <int?>[null, ...widget.cart.seats];
    return SizedBox(
      height: 46,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          for (final s in seats)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                selected: _seat == s,
                showCheckmark: false,
                onSelected: (_) {
                  HapticFeedback.selectionClick();
                  setState(() => _seat = s);
                },
                label: Text(s == null ? 'Всем' : '$s · ${widget.cart.seatName(s)}'),
                labelStyle: TextStyle(color: _seat == s ? Colors.white : C.ink, fontWeight: FontWeight.w600),
                selectedColor: C.ink,
                backgroundColor: Colors.white,
                side: BorderSide.none,
                shape: const StadiumBorder(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _content(bool searching) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, style: const TextStyle(color: C.muted)),
            TextButton(onPressed: () => _load(force: true), child: const Text('Повторить')),
          ],
        ),
      );
    }
    if (searching) return _productGrid(_found);
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      child: _open == null ? _groupGrid() : _productGrid(_open!.products, key: ValueKey(_open!.id)),
    );
  }

  Widget _groupGrid() {
    return GridView.builder(
      key: const ValueKey('groups'),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 200,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.25,
      ),
      itemCount: _groups.length,
      itemBuilder: (context, i) {
        final g = _groups[i];
        final img = g.products.map((p) => Api.imageUrl(p['image'])).whereType<String>().firstOrNull;
        final inCart = g.products.fold<int>(0, (s, p) => s + widget.cart.countFor(p['id'].toString(), _seat));
        return Material(
          color: C.ink,
          borderRadius: BorderRadius.circular(20),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() => _open = g);
            },
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (img != null) Image.network(img, fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox()),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0x10091027), Color(0xCC091027)],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (inCart > 0) _Badge(inCart),
                      const Spacer(),
                      Text(
                        g.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
                      ),
                      Text('${g.products.length} поз.', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _productGrid(List<Map<String, dynamic>> list, {Key? key}) {
    if (list.isEmpty) {
      return const Center(
        child: Text('Ничего не нашлось', style: TextStyle(color: C.muted)),
      );
    }
    return GridView.builder(
      key: key,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 200,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.72,
      ),
      itemCount: list.length,
      itemBuilder: (context, i) {
        final p = list[i];
        return _DishTile(
          p: p,
          count: widget.cart.countFor(p['id'].toString(), _seat),
          onAdd: () => _add(p),
          onRemove: () => _remove(p),
        );
      },
    );
  }

  Widget? _bottom() {
    final n = widget.cart.pendingQty;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
        child: FilledButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(n == 0 ? 'К столу' : 'Готово · $n · ${rub(widget.cart.pendingSum)}'),
        ),
      ),
    );
  }
}

class _DishTile extends StatelessWidget {
  const _DishTile({required this.p, required this.count, required this.onAdd, required this.onRemove});
  final Map<String, dynamic> p;
  final int count;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final img = Api.imageUrl(p['image']);
    final stop = p['isInStopList'] == true;
    final weight = (p['weight'] ?? '').toString();
    return Opacity(
      opacity: stop ? .45 : 1,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onAdd,
          onLongPress: count > 0 ? onRemove : null,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                flex: 5,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    img != null
                        ? Image.network(img, fit: BoxFit.cover, errorBuilder: (_, _, _) => _placeholder())
                        : _placeholder(),
                    if (stop) const Positioned(left: 8, top: 8, child: _Tag('Стоп', C.danger)),
                    if (count > 0)
                      Positioned(
                        right: 6,
                        top: 6,
                        child: Row(
                          children: [
                            Material(
                              color: Colors.white,
                              shape: const CircleBorder(),
                              child: InkWell(
                                customBorder: const CircleBorder(),
                                onTap: onRemove,
                                child: const Padding(padding: EdgeInsets.all(6), child: Icon(Icons.remove, size: 18)),
                              ),
                            ),
                            const SizedBox(width: 4),
                            _Badge(count, big: true),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                flex: 4,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p['name'].toString(),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, height: 1.2),
                      ),
                      const Spacer(),
                      Row(
                        children: [
                          Text(
                            rub((p['price'] as num?) ?? 0),
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                          ),
                          const Spacer(),
                          if (weight.isNotEmpty)
                            Flexible(
                              child: Text(
                                weight,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: C.muted, fontSize: 12),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _placeholder() {
    final name = p['name'].toString();
    return Container(
      color: const Color(0xFFEFEEF4),
      alignment: Alignment.center,
      child: Text(
        name.isEmpty ? '?' : name.characters.first.toUpperCase(),
        style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: Color(0xFFC9C8D3)),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge(this.n, {this.big = false});
  final int n;
  final bool big;
  @override
  Widget build(BuildContext context) => Container(
    constraints: BoxConstraints(minWidth: big ? 30 : 24),
    height: big ? 30 : 24,
    padding: const EdgeInsets.symmetric(horizontal: 7),
    alignment: Alignment.center,
    decoration: BoxDecoration(color: C.ok, borderRadius: BorderRadius.circular(15)),
    child: Text(
      '$n',
      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: big ? 15 : 13),
    ),
  );
}

class _Tag extends StatelessWidget {
  const _Tag(this.text, this.color);
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
    child: Text(
      text,
      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
    ),
  );
}
