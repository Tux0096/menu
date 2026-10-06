import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Адрес бэкенда меню. Для тестовой сборки: --dart-define=API_BASE=https://...
const String kApiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://menu.franchise-fuji.ru');

class ApiError implements Exception {
  ApiError(this.message, [this.status = 0, this.code, this.details]);
  final String message;
  final int status;
  final String? code;
  final Map? details;
  @override
  String toString() => message;
}

/// Клиент API официанта: токен и выбранный ресторан хранятся на телефоне.
class Api {
  Api._();
  static final Api I = Api._();

  String? token;
  String? restaurantSlug;
  String? restaurantName;
  String? staffName;
  final _authLost = StreamController<void>.broadcast();
  Stream<void> get onAuthLost => _authLost.stream;

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    token = p.getString('token');
    restaurantSlug = p.getString('restaurant');
    restaurantName = p.getString('restaurantName');
    staffName = p.getString('staffName');
  }

  Future<void> setRestaurant(String slug, String name) async {
    restaurantSlug = slug;
    restaurantName = name;
    final p = await SharedPreferences.getInstance();
    await p.setString('restaurant', slug);
    await p.setString('restaurantName', name);
  }

  Future<void> logout() async {
    token = null;
    staffName = null;
    final p = await SharedPreferences.getInstance();
    await p.remove('token');
    await p.remove('staffName');
  }

  Future<dynamic> _send(String method, String path, [Object? body]) async {
    final sep = path.contains('?') ? '&' : '?';
    final withRest = path.startsWith('/api/v1/waiter') && restaurantSlug != null
        ? '$path${sep}restaurant=${Uri.encodeComponent(restaurantSlug!)}'
        : path;
    final uri = Uri.parse('$kApiBase$withRest');
    final headers = {'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token'};
    http.Response res;
    try {
      final req = switch (method) {
        'POST' => http.post(uri, headers: headers, body: jsonEncode(body ?? {})),
        'DELETE' => http.delete(uri, headers: headers),
        _ => http.get(uri, headers: headers),
      };
      res = await req.timeout(const Duration(seconds: 20));
    } on TimeoutException {
      throw ApiError('Сервер не отвечает — проверьте интернет');
    } catch (_) {
      throw ApiError('Нет связи с сервером');
    }
    final text = utf8.decode(res.bodyBytes);
    dynamic data;
    try {
      data = text.isEmpty ? null : jsonDecode(text);
    } catch (_) {
      data = null;
    }
    if (res.statusCode == 401 && token != null && !path.contains('pin-login')) {
      // Почему вышли: смена в iiko закрыта или сессия истекла — покажем на экране входа
      authLostReason = data is Map && data['code'] == 'SHIFT_CLOSED' ? data['error']?.toString() : null;
      await logout();
      _authLost.add(null);
    }
    if (res.statusCode >= 400) {
      final msg = data is Map && data['error'] != null ? data['error'].toString() : 'Ошибка ${res.statusCode}';
      throw ApiError(
        msg,
        res.statusCode,
        data is Map ? data['code']?.toString() : null,
        data is Map && data['details'] is Map ? data['details'] as Map : null,
      );
    }
    return data;
  }

  Future<dynamic> get(String path) => _send('GET', path);
  Future<dynamic> post(String path, [Object? body]) => _send('POST', path, body);
  Future<dynamic> delete(String path) => _send('DELETE', path);

  Future<List<Map<String, dynamic>>> restaurants() async =>
      List<Map<String, dynamic>>.from(await get('/api/v1/restaurants') as List);

  /// Как входят официанты: 'iiko' — код сотрудника из iiko, точка по открытой смене (как в iikoWaiter);
  /// 'pin' — PIN из админки в выбранном ресторане.
  String loginMode = 'pin';
  String? authLostReason;

  Future<void> fetchLoginMode() async {
    final p = await SharedPreferences.getInstance();
    loginMode = p.getString('loginMode') ?? 'pin';
    try {
      final d = await get('/api/v1/staff/login-mode').timeout(const Duration(seconds: 5)) as Map;
      loginMode = d['mode'] == 'iiko' ? 'iiko' : 'pin';
      await p.setString('loginMode', loginMode);
    } catch (_) {
      // Нет связи — режим из прошлого запуска
    }
  }

  bool get iikoLogin => loginMode == 'iiko';

  Future<void> pinLogin(String pin, {String? restaurant}) async {
    final d = await post('/api/v1/staff/pin-login', {
      'pin': pin,
      if (restaurant != null || !iikoLogin) 'restaurant': restaurant ?? restaurantSlug,
    }) as Map;
    token = d['token'] as String;
    // Вход через iiko: точка — та, где у сотрудника открыта смена
    final r = d['restaurant'];
    if (r is Map && r['slug'] != null) {
      if (r['slug'].toString() != restaurantSlug) _catalog = null;
      await setRestaurant(r['slug'].toString(), (r['name'] ?? r['slug']).toString());
    }
    staffName = (d['staff'] as Map?)?['name']?.toString();
    final p = await SharedPreferences.getInstance();
    await p.setString('token', token!);
    if (staffName != null) await p.setString('staffName', staffName!);
  }

  // ── Меню ресторана (кэш на сессию приложения) ──
  Map<String, dynamic>? _catalog;
  DateTime? _catalogAt;
  Future<Map<String, dynamic>> catalog({bool force = false}) async {
    if (!force && _catalog != null && DateTime.now().difference(_catalogAt!) < const Duration(minutes: 1)) {
      return _catalog!;
    }
    _catalog = Map<String, dynamic>.from(await get('/api/v1/restaurants/$restaurantSlug/catalog') as Map);
    _catalogAt = DateTime.now();
    return _catalog!;
  }

  // ── Стоп-лист iiko: что закончилось и что осталось в ограниченном количестве ──
  /// Свежий стоп-лист; заодно обновляет отметки в кэше меню, чтобы плитки показывали актуальное.
  Future<Map<String, dynamic>> stopList() async {
    final d = Map<String, dynamic>.from(await get('/api/v1/waiter/stop-list') as Map);
    final byId = <String, Map>{for (final it in (d['items'] as List? ?? const [])) it['id'].toString(): it as Map};
    for (final raw in (_catalog?['products'] as List? ?? const [])) {
      final p = raw as Map;
      final st = byId[p['id'].toString()];
      p['isInStopList'] = st?['stopped'] == true;
      if (st != null && st['stopped'] != true && ((st['balance'] as num?) ?? 0) > 0) {
        p['stopBalance'] = st['balance'];
      } else {
        p.remove('stopBalance');
      }
    }
    return d;
  }

  static String? imageUrl(dynamic image) {
    if (image == null) return null;
    final s = image is Map ? (image['url'] ?? image['src'])?.toString() : image.toString();
    if (s == null || s.isEmpty) return null;
    if (s.startsWith('http')) return s;
    return '$kApiBase${s.startsWith('/') ? '' : '/'}$s';
  }
}

String rub(num v) {
  final s = v.round().toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(' ');
    b.write(s[i]);
  }
  return '$b ₽';
}
