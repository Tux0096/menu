import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api.dart';

/// Push-уведомления (Firebase Cloud Messaging).
/// Без google-services.json / GoogleService-Info.plist приложение работает без push —
/// схема зала и уведомления обновляются опросом сервера.
class Push {
  Push._();
  static final Push I = Push._();

  bool available = false;
  String? _token;
  final _messages = StreamController<RemoteMessage>.broadcast();
  final _opened = StreamController<Map<String, dynamic>>.broadcast();

  /// Пришло уведомление, пока приложение открыто.
  Stream<RemoteMessage> get onForeground => _messages.stream;

  /// Официант нажал на уведомление — открыть стол.
  Stream<Map<String, dynamic>> get onOpened => _opened.stream;
  Map<String, dynamic>? pendingOpen;

  Future<void> init() async {
    if (kIsWeb) return;
    try {
      await Firebase.initializeApp();
      available = true;
    } catch (e) {
      debugPrint('Firebase не настроен: $e');
      return;
    }
    FirebaseMessaging.onMessage.listen(_messages.add);
    FirebaseMessaging.onMessageOpenedApp.listen((m) => _opened.add(m.data));
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) pendingOpen = initial.data;
    FirebaseMessaging.instance.onTokenRefresh.listen((t) => _register(t));
  }

  /// После входа: разрешение на уведомления и привязка телефона к ресторану.
  Future<void> registerDevice() async {
    if (!available || Api.I.token == null) return;
    try {
      final m = FirebaseMessaging.instance;
      await m.requestPermission(alert: true, badge: true, sound: true);
      await m.setForegroundNotificationPresentationOptions(alert: false, badge: true, sound: false);
      final t = await m.getToken();
      if (t != null) await _register(t);
    } catch (e) {
      debugPrint('Push: $e');
    }
  }

  Future<void> _register(String t) async {
    _token = t;
    if (Api.I.token == null) return;
    try {
      await Api.I.post('/api/v1/waiter/devices', {
        'token': t,
        'platform': defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
      });
    } catch (e) {
      debugPrint('Push register: $e');
    }
  }

  /// При выходе телефон перестаёт получать уведомления ресторана.
  Future<void> unregister() async {
    final t = _token;
    if (t == null || Api.I.token == null) return;
    try {
      await Api.I.delete('/api/v1/waiter/devices/${Uri.encodeComponent(t)}');
    } catch (_) {}
  }

  static const loud = {'dish_ready', 'cart_ready', 'reorder_intent', 'call_waiter', 'bill_requested', 'wait_too_long'};

  /// Сигнал внутри приложения: вибрация и системный звук для важных событий.
  static void signal(String? type) {
    if (loud.contains(type)) {
      HapticFeedback.heavyImpact();
      SystemSound.play(SystemSoundType.alert);
    } else {
      HapticFeedback.selectionClick();
    }
  }
}

/// Баннер уведомления поверх экрана.
void showPushBanner(BuildContext context, {required String title, String? body, VoidCallback? onTap}) {
  final m = ScaffoldMessenger.of(context);
  m.hideCurrentMaterialBanner();
  m.showMaterialBanner(
    MaterialBanner(
      backgroundColor: const Color(0xFF091027),
      elevation: 2,
      leading: const Icon(Icons.notifications_active, color: Colors.white),
      content: GestureDetector(
        onTap: () {
          m.hideCurrentMaterialBanner();
          onTap?.call();
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15),
            ),
            if (body != null && body.isNotEmpty)
              Text(body, style: const TextStyle(color: Colors.white70, fontSize: 13)),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            m.hideCurrentMaterialBanner();
            onTap?.call();
          },
          child: Text(onTap != null ? 'Открыть' : 'OK', style: const TextStyle(color: Colors.white)),
        ),
      ],
    ),
  );
  Future.delayed(const Duration(seconds: 6), () {
    try {
      m.hideCurrentMaterialBanner();
    } catch (_) {}
  });
}
