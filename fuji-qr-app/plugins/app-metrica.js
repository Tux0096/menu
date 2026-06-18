import { AppMetrica } from 'capacitor-appmetrica-plugin';

export default () => {
    AppMetrica.activate({
        apiKey: process.env.APP_METRICA_KEY,
        logs: true
    }).then(() => {
        console.log('AppMetrica приложения запущена.')
    }).catch((error) => {
        console.log(error)
    });
}

