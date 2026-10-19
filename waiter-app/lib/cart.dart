import 'dart:math';

import 'package:flutter/foundation.dart';

final _rnd = Random.secure();

/// ID новой строки создаёт приложение: повторное сохранение заменяет ту же строку, а не добавляет вторую.
String newRowId() {
  final b = List<int>.generate(16, (_) => _rnd.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  final h = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

/// Заказ стола в редактировании: общий для экрана стола и меню плитками.
class TableCart extends ChangeNotifier {
  List<Map<String, dynamic>> items = [];
  List<Map<String, dynamic>> guests = [];
  int guestCount = 1;
  int version = 0;

  /// Имена гостей, которых добавил официант: место → имя.
  Map<String, String> seatNames = {};

  /// Неотправленные строки, которые официант видел: сервер заменяет только их, а блюда, добавленные гостем
  /// за это время, оставляет (раньше сохранение официанта молча их стирало).
  List<String> knownIds = [];

  void loadFrom(Map<String, dynamic> s) {
    items = List<Map<String, dynamic>>.from((s['items'] as List? ?? const []).map((e) => Map<String, dynamic>.from(e)));
    knownIds = [for (final i in items) if (i['isLocked'] != true && i['id'] != null) i['id'].toString()];
    guests = List<Map<String, dynamic>>.from(
      (s['guests'] as List? ?? const []).map((e) => Map<String, dynamic>.from(e)),
    );
    guestCount = (s['guestCount'] as num?)?.toInt() ?? 1;
    seatNames = {for (final e in ((s['seatNames'] as Map?) ?? const {}).entries) e.key.toString(): e.value.toString()};
    notifyListeners();
  }

  List<int> get seats {
    final n = [guestCount, guests.length, 1].reduce((a, b) => a > b ? a : b);
    return List.generate(n, (i) => i + 1);
  }

  String seatName(int? seat) {
    if (seat == null) return 'Без гостя';
    final g = guests.where((g) => g['seat'] == seat).firstOrNull;
    if (g != null) return g['name'].toString();
    final named = seatNames['$seat'];
    return named != null && named.isNotEmpty ? named : 'Гость $seat';
  }

  /// Гость присоединился сам (по QR) — его имя не меняем.
  bool isJoinedGuest(int seat) => guests.any((g) => g['seat'] == seat);

  void setSeatName(int seat, String name) {
    seatNames = {...seatNames, '$seat': name.trim()};
    _changed();
  }

  static int? seatOf(Map<String, dynamic> it) => (it['seatNumber'] as num?)?.toInt();

  int countFor(String productId, int? seat) => items
      .where((i) => i['isLocked'] != true && i['productId']?.toString() == productId && seatOf(i) == seat)
      .fold(0, (s, i) => s + ((i['quantity'] as num?)?.toInt() ?? 0));

  /// Сколько этой позиции в неотправленной части на всех местах (для остатка «осталось N»)
  int pendingFor(String productId) => items
      .where((i) => i['isLocked'] != true && i['productId']?.toString() == productId)
      .fold(0, (s, i) => s + ((i['quantity'] as num?)?.toInt() ?? 0));

  int get pendingQty =>
      items.where((i) => i['isLocked'] != true).fold(0, (s, i) => s + ((i['quantity'] as num?)?.toInt() ?? 0));

  num get pendingSum => items
      .where((i) => i['isLocked'] != true)
      .fold<num>(0, (s, i) => s + ((i['price'] as num?) ?? 0) * ((i['quantity'] as num?) ?? 0));

  static bool isBar(Map<String, dynamic> it) => (it['source'] ?? 'main') != 'main';

  /// На столе есть позиции и кухни, и бара — тогда в приложении показываем, что на какой кассе
  bool get mixedCashes => items.any(isBar) && items.any((i) => !isBar(i));

  num sumWhere(bool Function(Map<String, dynamic>) test) =>
      items.where(test).fold<num>(0, (s, i) => s + ((i['price'] as num?) ?? 0) * ((i['quantity'] as num?) ?? 0));

  num get total => items.fold<num>(0, (s, i) => s + ((i['price'] as num?) ?? 0) * ((i['quantity'] as num?) ?? 0));

  void _changed() {
    version++;
    notifyListeners();
  }

  /// Выбор строки (размер + модификаторы): «+» прибавляет только к строке с тем же выбором —
  /// вок официанта без выбора не сливается с воком гостя «с говядиной».
  static String variantOf(Map<String, dynamic> i) {
    final mods = [
      for (final m in (i['modifiers'] as List? ?? const [])) '${(m as Map)['id']}:${m['amount'] ?? 1}',
    ]..sort();
    return '${i['sizeId'] ?? ''}|${mods.join(',')}';
  }

  void add(Map<String, dynamic> p, int? seat, {String? sizeId, List<Map<String, dynamic>> modifiers = const [], num? price, String? options}) {
    final id = p['id'].toString();
    final row = <String, dynamic>{'sizeId': sizeId, 'modifiers': modifiers};
    final key = variantOf(row);
    final existing = items
        .where((i) => i['isLocked'] != true && i['productId']?.toString() == id && seatOf(i) == seat && variantOf(i) == key)
        .firstOrNull;
    if (existing != null) {
      existing['quantity'] = ((existing['quantity'] as num?)?.toInt() ?? 0) + 1;
    } else {
      items.add({
        'id': newRowId(),
        'local': true,
        'productId': id,
        'iikoProductId': p['iikoId'] ?? id,
        'name': options != null && options.isNotEmpty ? '${p['name']} ($options)' : p['name'],
        'price': price ?? p['price'] ?? 0,
        'quantity': 1,
        'isLocked': false,
        'seatNumber': seat,
        'course': null,
        'sizeId': ?sizeId,
        if (modifiers.isNotEmpty) 'modifiers': modifiers,
        // Касса iiko: main — кухня, иначе бар (сервер уточнит при сохранении)
        'source': p['source'] ?? 'main',
      });
    }
    _changed();
  }

  /// «−» на плитке: сначала строки официанта без выбора, затем добавленные официантом с выбором;
  /// выбор гостя с плитки не убирается (его меняют на экране стола).
  void remove(String productId, int? seat) {
    final mine = items.where((i) => i['isLocked'] != true && i['productId']?.toString() == productId && seatOf(i) == seat);
    final it = mine.where((i) => variantOf(i) == '|').lastOrNull ?? mine.where((i) => i['local'] == true).lastOrNull;
    if (it != null) setQty(it, ((it['quantity'] as num?)?.toInt() ?? 0) - 1);
  }

  void setQty(Map<String, dynamic> it, int q) {
    if (q <= 0) {
      items.remove(it);
    } else {
      it['quantity'] = q;
    }
    _changed();
  }

  void setCourse(Map<String, dynamic> it, int? course) {
    it['course'] = course;
    _changed();
  }

  void setSeat(Map<String, dynamic> it, int? seat) {
    it['seatNumber'] = seat;
    _changed();
  }

  void setGuestCount(int n) {
    guestCount = n.clamp(1, 30);
    _changed();
  }

  Map<String, dynamic> toBody() => {
    'guestCount': guestCount,
    'seatNames': seatNames,
    // Строки, созданные здесь, тоже «видены»: сервер заменяет их, даже если ответ прошлого сохранения не применился
    'knownIds': {...knownIds, for (final i in items) if (i['local'] == true) i['id'].toString()}.toList(),
    'items': items
        .map(
          (i) => {
            if (i['id'] != null) 'id': i['id'],
            if (i['local'] == true) 'local': true,
            'productId': i['productId'],
            'iikoProductId': i['iikoProductId'],
            'name': i['name'],
            'price': i['price'],
            'quantity': i['quantity'],
            'seatNumber': i['seatNumber'],
            'course': i['course'],
            if (i['sizeId'] != null) 'sizeId': i['sizeId'],
            if (i['modifiers'] != null) 'modifiers': i['modifiers'],
          },
        )
        .toList(),
  };
}
