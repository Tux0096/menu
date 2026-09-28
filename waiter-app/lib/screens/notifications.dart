import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';

/// Лента уведомлений ресторана: заказы гостей, вызовы, «блюдо готово».
class NotificationsView extends StatefulWidget {
  const NotificationsView({super.key, required this.onOpen, required this.onChanged});
  final void Function(String sessionId, String tableNumber) onOpen;
  final VoidCallback onChanged;
  @override
  State<NotificationsView> createState() => NotificationsViewState();
}

class NotificationsViewState extends State<NotificationsView> {
  List<Map<String, dynamic>> _list = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    reload();
  }

  Future<void> reload() async {
    try {
      final d = await Api.I.get('/api/v1/waiter/notifications') as List;
      if (!mounted) return;
      setState(() {
        _list = List<Map<String, dynamic>>.from(d);
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

  Future<void> readAll() async {
    await Api.I.post('/api/v1/waiter/notifications/read-all');
    await reload();
  }

  static IconData _icon(String? type) => switch (type) {
    'dish_ready' => Icons.room_service_outlined,
    'cart_ready' || 'reorder_intent' => Icons.receipt_long_outlined,
    'call_waiter' => Icons.back_hand_outlined,
    'bill_requested' => Icons.payments_outlined,
    'wait_too_long' => Icons.timer_outlined,
    _ => Icons.notifications_none,
  };

  static Color _color(String? type) => switch (type) {
    'dish_ready' => C.ok,
    'cart_ready' || 'reorder_intent' || 'call_waiter' || 'wait_too_long' => C.danger,
    'bill_requested' => C.violet,
    _ => C.muted,
  };

  static String _ago(String? iso) {
    final t = DateTime.tryParse(iso ?? '');
    if (t == null) return '';
    final m = DateTime.now().difference(t.toLocal()).inMinutes;
    if (m < 1) return 'только что';
    if (m < 60) return '$m мин назад';
    final l = t.toLocal();
    return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: reload,
      child: _list.isEmpty
          ? ListView(
              children: [
                const SizedBox(height: 120),
                Center(
                  child: Text(_error ?? 'Уведомлений нет', style: const TextStyle(color: C.muted)),
                ),
              ],
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              itemCount: _list.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final n = _list[i];
                final unread = n['is_read'] != true;
                final type = n['type']?.toString();
                return Material(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () async {
                      if (unread) {
                        Api.I.post('/api/v1/waiter/notifications/${n['id']}/read').then((_) => widget.onChanged());
                        setState(() => n['is_read'] = true);
                      }
                      final sid = n['session_id']?.toString();
                      if (sid != null && sid.isNotEmpty) widget.onOpen(sid, n['table_number']?.toString() ?? '');
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: _color(type).withValues(alpha: .12),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(_icon(type), color: _color(type), size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        n['title']?.toString() ?? '',
                                        style: TextStyle(
                                          fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
                                          fontSize: 15,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      _ago(n['created_at']?.toString()),
                                      style: const TextStyle(color: C.muted, fontSize: 12),
                                    ),
                                  ],
                                ),
                                if ((n['body'] ?? '').toString().isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(n['body'].toString(), maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: C.muted)),
                                  ),
                              ],
                            ),
                          ),
                          if (unread)
                            Container(
                              margin: const EdgeInsets.only(left: 8, top: 6),
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(color: C.danger, shape: BoxShape.circle),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
