import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api.dart';
import 'push.dart';
import 'screens/hall.dart';
import 'screens/login.dart';
import 'theme.dart';

final navigatorKey = GlobalKey<NavigatorState>();
final messengerKey = GlobalKey<ScaffoldMessengerState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: C.bg,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  await Api.I.load();
  await Push.I.init();
  runApp(const WaiterApp());
}

class WaiterApp extends StatefulWidget {
  const WaiterApp({super.key});
  @override
  State<WaiterApp> createState() => _WaiterAppState();
}

class _WaiterAppState extends State<WaiterApp> {
  StreamSubscription<void>? _authSub;

  @override
  void initState() {
    super.initState();
    _authSub = Api.I.onAuthLost.listen((_) {
      navigatorKey.currentState?.pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const PinScreen()), (_) => false);
      messengerKey.currentState?.showSnackBar(const SnackBar(content: Text('Сессия закончилась — войдите по PIN')));
    });
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Widget home = Api.I.restaurantSlug == null
        ? const RestaurantScreen()
        : Api.I.token == null
        ? const PinScreen()
        : const HallScreen();
    return MaterialApp(
      title: 'Фуджи Официант',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      navigatorKey: navigatorKey,
      scaffoldMessengerKey: messengerKey,
      home: home,
    );
  }
}
