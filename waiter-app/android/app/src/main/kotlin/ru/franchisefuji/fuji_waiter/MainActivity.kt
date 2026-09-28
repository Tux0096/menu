package ru.franchisefuji.fuji_waiter

import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createChannels()
    }

    // Каналы push: «Важное» (готово, заказ, вызов, счёт) — звук и вибрация; «Прочее» — тихо
    private fun createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return
        val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val alerts = NotificationChannel("waiter_alerts", "Важное: заказы и готовые блюда", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Блюдо готово, гость ждёт, вызов официанта, счёт"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 300, 150, 300)
            setSound(sound, attrs)
        }
        val info = NotificationChannel("waiter_info", "Прочее", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Гость открыл меню и другие события"
        }
        nm.createNotificationChannels(listOf(alerts, info))
    }
}
