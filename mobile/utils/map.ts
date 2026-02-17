import { Linking, Platform, Alert } from 'react-native';

/**
 * Abre o aplicativo de mapas (Google Maps, Waze, Apple Maps)
 * Prioriza as coordenadas se disponíveis, fallbacks para endereço.
 */
export const openNavigation = (lat?: number, lng?: number, address?: string) => {
    if (lat && lng) {
        const label = address ? encodeURIComponent(address) : 'Destino';
        const url = Platform.select({
            ios: `maps:0,0?q=${label}&ll=${lat},${lng}`,
            android: `geo:0,0?q=${lat},${lng}(${label})`
        });

        if (url) {
            Linking.openURL(url).catch(err => {
                console.error('Erro ao abrir mapa:', err);
                Alert.alert('Erro', 'Não foi possível abrir o aplicativo de mapas.');
            });
            return;
        }
    }

    if (address) {
        const query = encodeURIComponent(address);
        const url = Platform.select({
            ios: `maps:0,0?q=${query}`,
            android: `geo:0,0?q=${query}`
        });

        if (url) {
            Linking.openURL(url).catch(err => {
                console.error('Erro ao abrir mapa (endereço):', err);
                Alert.alert('Erro', 'Não foi possível abrir o aplicativo de mapas.');
            });
            return;
        }
    }

    Alert.alert('Ops', 'Dados de localização indisponíveis (sem endereço ou coordenadas).');
};
