import 'package:flutter/foundation.dart';

/// Заказ стола в редактировании: общий для экрана стола и меню плитками.
class TableCart extends ChangeNotifier {
  List<Map<String, dynamic>> items = [];
  List<Map<String, dynamic>> guests = [];
  int guestCount = 1;
  int version = 0;

  /// Имена гостей, которых добавил официант: место → имя.
  Map<String, String> seatNames = {};

  void loadFrom(Map<String, dynamic> s) {
    items = List<Map<String, dynamic>>.from((s['items'] as List? ?? const []).map((e) => Map<String, dynamic>.from(e)));
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

  int get pendingQty =>
      items.where((i) => i['isLocked'] != true).fold(0, (s, i) => s + ((i['quantity'] as num?)?.toInt() ?? 0));

  num get pendingSum => items
      .where((i) => i['isLocked'] != true)
      .fold<num>(0, (s, i) => s + ((i['price'] as num?) ?? 0) * ((i['quantity'] as num?) ?? 0));

  num get total => items.fold<num>(0, (s, i) => s + ((i['price'] as num?) ?? 0) * ((i['quantity'] as num?) ?? 0));

  void _changed() {
    version++;
    notifyListeners();
  }

  void add(Map<String, dynamic> p, int? seat) {
    final id = p['id'].toString();
    final existing = items
        .where((i) => i['isLocked'] != true && i['productId']?.toString() == id && seatOf(i) == seat)
        .firstOrNull;
    if (existing != null) {
      existing['quantity'] = ((existing['quantity'] as num?)?.toInt() ?? 0) + 1;
    } else {
      items.add({
        'productId': id,
        'iikoProductId': p['iikoId'] ?? id,
        'name': p['name'],
        'price': p['price'] ?? 0,
        'quantity': 1,
        'isLocked': false,
        'seatNumber': seat,
        'course': null,
      });
    }
    _changed();
  }

  void remove(String productId, int? seat) {
    final it = items
        .where((i) => i['isLocked'] != true && i['productId']?.toString() == productId && seatOf(i) == seat)
        .lastOrNull;
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
    'items': items
        .map(
          (i) => {
            if (i['id'] != null) 'id': i['id'],
            'productId': i['productId'],
            'iikoProductId': i['iikoProductId'],
            'name': i['name'],
            'price': i['price'],
            'quantity': i['quantity'],
            'seatNumber': i['seatNumber'],
            'course': i['course'],
          },
        )
        .toList(),
  };
}
