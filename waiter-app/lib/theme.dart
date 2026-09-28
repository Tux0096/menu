import 'package:flutter/material.dart';

class C {
  static const bg = Color(0xFFF5F4F9);
  static const card = Colors.white;
  static const ink = Color(0xFF091027);
  static const muted = Color(0xFF7E7F83);
  static const line = Color(0xFFECEBF2);
  static const ok = Color(0xFF1E9E6A);
  static const warn = Color(0xFFE08A00);
  static const danger = Color(0xFFD8374B);
  static const violet = Color(0xFF5A52D5);
}

/// Цвет и подпись состояния стола на схеме зала.
class Tone {
  const Tone(this.color, this.bg, this.label);
  final Color color;
  final Color bg;
  final String label;

  static Tone of(String tone) => switch (tone) {
    'ready' => const Tone(C.ok, Color(0xFFE3F5EC), 'Готово'),
    'waiting' => const Tone(C.danger, Color(0xFFFCE6E9), 'Ждут'),
    'bill' => const Tone(C.violet, Color(0xFFECEBFB), 'Счёт'),
    'work' => const Tone(C.warn, Color(0xFFFDF1DE), 'В работе'),
    'guests' => const Tone(C.ink, Colors.white, 'Гости'),
    _ => const Tone(C.muted, Color(0xFFEFEEF4), 'Свободен'),
  };
}

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: C.ink, primary: C.ink, surface: C.bg),
    scaffoldBackgroundColor: C.bg,
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: C.bg,
      foregroundColor: C.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(color: C.ink, fontSize: 20, fontWeight: FontWeight.w700),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: C.ink,
        foregroundColor: Colors.white,
        minimumSize: const Size(48, 52),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating, backgroundColor: C.ink),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    ),
  );
}

BoxDecoration cardBox({Color color = C.card, double r = 20}) => BoxDecoration(
  color: color,
  borderRadius: BorderRadius.circular(r),
  boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 14)],
);

void toast(BuildContext context, String text) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));
}
