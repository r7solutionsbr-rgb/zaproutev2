import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, Modal, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { api } from '../../api/client';
import { SignatureModal } from '../../components/SignatureModal';
import { openNavigation } from '../../utils/map';

export default function DeliveryDetails() {
    const { id } = useLocalSearchParams();
    const [delivery, setDelivery] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Camera State
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraVisible, setCameraVisible] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [photo, setPhoto] = useState<string | null>(null);
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null);

    // Signature State
    const [signatureModalVisible, setSignatureModalVisible] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);

    // Failure Modal State
    const [failureModalVisible, setFailureModalVisible] = useState(false);
    const [failureReason, setFailureReason] = useState('');

    useEffect(() => {
        fetchDelivery();
    }, [id]);

    const fetchDelivery = async () => {
        try {
            const response = await api.get(`/deliveries/${id}`);
            setDelivery(response.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar os detalhes da entrega.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleCall = () => {
        if (delivery?.customer?.phone) {
            Linking.openURL(`tel:${delivery.customer.phone}`);
        } else {
            Alert.alert('Indisponível', 'Telefone não cadastrado.');
        }
    };

    // ... (lines 13-58)

    const handleNavigate = () => {
        openNavigation(delivery?.deliveryLat, delivery?.deliveryLng, delivery?.deliveryAddress);
    };

    const handleCamera = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
                return;
            }
        }
        setCameraVisible(true);
        setScanning(false);
    };

    const handleScan = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
                return;
            }
        }
        setScanning(true);
        setCameraVisible(true);
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.7,
                    base64: false,
                    skipProcessing: true
                });

                const manipResult = await ImageManipulator.manipulateAsync(
                    photo!.uri,
                    [{ resize: { width: 800 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                setPhoto(manipResult.uri);
                setCameraVisible(false);
            } catch (error) {
                Alert.alert('Erro', 'Falha ao tirar foto.');
            }
        }
    };

    const handleBarcodeScanned = ({ type, data }: { type: string, data: string }) => {
        setScanning(false);
        setCameraVisible(false);
        setScannedCode(data);
        Alert.alert('Sucesso', `Código de barras validado: ${data}`);
    };

    const handleSignature = (signatureBase64: string) => {
        setSignature(signatureBase64);
    };

    const handleConfirmDelivery = async () => {
        if (!photo) {
            Alert.alert('Atenção', 'A foto do comprovante é obrigatória.');
            return;
        }

        setUploading(true);
        const formData = new FormData();

        const filename = photo.split('/').pop();
        const match = /\.(\w+)$/.exec(filename!);
        const type = match ? `image/${match[1]}` : `image`;

        // @ts-ignore
        formData.append('file', { uri: photo, name: filename, type });

        let signatureUri = null;
        if (signature) {
            try {
                const signatureData = signature.replace("data:image/png;base64,", "");
                const signaturePath = LegacyFileSystem.cacheDirectory + 'signature.png';
                await LegacyFileSystem.writeAsStringAsync(signaturePath, signatureData, {
                    encoding: 'base64',
                });
                signatureUri = signaturePath;

                // @ts-ignore
                formData.append('signature', { uri: signatureUri, name: 'signature.png', type: 'image/png' });
            } catch (err) {
                console.error("Erro ao salvar assinatura", err);
                Alert.alert('Erro', 'Falha ao processar assinatura.');
                setUploading(false);
                return;
            }
        }

        try {
            await api.post(`/deliveries/${id}/confirm`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            Alert.alert('Sucesso', 'Entrega confirmada com sucesso!');

            if (signatureUri) {
                await FileSystem.deleteAsync(signatureUri, { idempotent: true }).catch(() => { });
            }
            router.replace('/(tabs)');
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao confirmar entrega.');
        } finally {
            setUploading(false);
        }
    };

    const handleFailureSubmit = async () => {
        if (!failureReason.trim()) {
            Alert.alert('Atenção', 'Informe o motivo.');
            return;
        }
        setUploading(true);
        try {
            await api.post(`/deliveries/${id}/fail`, { reason: failureReason });
            Alert.alert('Registrado', 'Ocorrência registrada com sucesso.');
            setFailureModalVisible(false);
            router.replace('/(tabs)');
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao registrar ocorrência.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950" />;
    }

    if (!delivery) return null;

    if (cameraVisible) {
        return (
            <View style={{ flex: 1 }}>
                <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    ref={cameraRef}
                    onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr", "ean13", "code128", "upc_e"],
                    }}
                />
                <View className="absolute top-0 bottom-0 left-0 right-0 justify-end pb-20 items-center" pointerEvents="box-none">
                    {scanning ? (
                        <View className="absolute top-0 bottom-0 left-0 right-0 justify-center items-center">
                            <View className="mb-20 items-center">
                                <View className="w-72 h-48 border-2 border-green-400 bg-transparent rounded-lg" />
                                <Text className="text-white font-bold mt-4 bg-black/60 px-4 py-2 rounded-full overflow-hidden">
                                    Aponte para o código de barras
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={takePicture}
                            className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 items-center justify-center shadow-lg"
                        >
                            <View className="w-16 h-16 bg-red-500 rounded-full" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={() => {
                            setCameraVisible(false);
                            setScanning(false);
                        }}
                        className="absolute top-12 right-6 bg-black/40 p-2 rounded-full"
                    >
                        <MaterialIcons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950">
            <Stack.Screen options={{ title: 'Detalhes da Entrega', headerBackTitle: 'Voltar' }} />

            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 120 }}>
                {/* CARD STATUS */}
                <View className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-slate-400 text-xs font-bold uppercase">Pedido #{delivery.orderId.slice(0, 8)}</Text>
                        <View className={`px-3 py-1 rounded-full ${delivery.status === 'DELIVERED' ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}>
                            <Text className={`${delivery.status === 'DELIVERED' ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'} text-xs font-bold uppercase`}>
                                {delivery.status === 'PENDING' ? 'Pendente' : delivery.status}
                            </Text>
                        </View>
                    </View>
                    <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">{delivery.customer?.tradeName}</Text>
                    <View className="flex-row items-center mt-2">
                        <MaterialIcons name="location-on" size={16} color="#475569" />
                        <Text className="text-slate-600 dark:text-slate-400 text-sm ml-1 flex-1">{delivery.deliveryAddress}</Text>
                    </View>


                    {/* VENDEDOR E CONTATO */}
                    {delivery.customer?.seller && (
                        <View className="flex-row items-center mb-4 px-4">
                            <MaterialIcons name="person-outline" size={16} color="#64748b" />
                            <Text className="text-slate-500 dark:text-slate-400 text-sm ml-2">
                                Vendedor: <Text className="font-bold text-slate-700 dark:text-slate-300">{delivery.customer.seller.name}</Text>
                            </Text>
                        </View>
                    )}
                </View>

                {/* RESUMO DO PEDIDO */}
                <View className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
                    <Text className="text-slate-800 dark:text-slate-100 font-bold text-lg mb-4">Resumo do Pedido</Text>

                    <View className="flex-row flex-wrap justify-between">
                        <View className="w-[48%] bg-slate-50 dark:bg-slate-800 p-2 rounded-xl mb-3 border border-slate-100 dark:border-slate-700">
                            <Text className="text-slate-400 text-[10px] uppercase font-bold mb-1">Qtd. Notas</Text>
                            <View className="flex-row items-center">
                                <MaterialIcons name="receipt-long" size={18} color="#64748b" />
                                <Text className="text-slate-800 dark:text-slate-100 font-bold text-base ml-2">1</Text>
                            </View>
                        </View>

                        <View className="w-[48%] bg-slate-50 dark:bg-slate-800 p-2 rounded-xl mb-3 border border-slate-100 dark:border-slate-700">
                            <Text className="text-slate-400 text-[10px] uppercase font-bold mb-1">Volume Total</Text>
                            <View className="flex-row items-center">
                                <FontAwesome5 name="box" size={14} color="#64748b" />
                                <Text className="text-slate-800 dark:text-slate-100 font-bold text-base ml-2">{delivery.volume || 0}</Text>
                            </View>
                        </View>

                        <View className="w-[48%] bg-slate-50 dark:bg-slate-800 p-2 rounded-xl mb-3 border border-slate-100 dark:border-slate-700">
                            <Text className="text-slate-400 text-[10px] uppercase font-bold mb-1">Valor Total</Text>
                            <View className="flex-row items-center">
                                <MaterialIcons name="attach-money" size={18} color="#64748b" />
                                <Text className="text-slate-800 dark:text-slate-100 font-bold text-base ml-1">R$ --</Text>
                            </View>
                        </View>

                        <View className="w-[48%] bg-slate-50 dark:bg-slate-800 p-2 rounded-xl mb-3 border border-slate-100 dark:border-slate-700">
                            <Text className="text-slate-400 text-[10px] uppercase font-bold mb-1">Pagamento</Text>
                            <View className="flex-row items-center">
                                <MaterialIcons name="credit-card" size={18} color="#64748b" />
                                <Text className="text-slate-800 dark:text-slate-100 font-bold text-xs ml-2">Boleto</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* AÇÕES (Call/Navigate) */}
                {
                    delivery.status === 'PENDING' && (
                        <View className="flex-row gap-4 mb-6">
                            <TouchableOpacity
                                onPress={handleNavigate}
                                className="flex-1 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl items-center border border-blue-100 dark:border-blue-800 active:bg-blue-100 dark:active:bg-blue-900/50"
                            >
                                <MaterialIcons name="navigation" size={20} color="#2563eb" />
                                <Text className="text-blue-700 dark:text-blue-400 font-bold text-xs mt-1">Navegar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleCall}
                                className="flex-1 bg-green-50 dark:bg-green-900/30 p-3 rounded-xl items-center border border-green-100 dark:border-green-800 active:bg-green-100 dark:active:bg-green-900/50"
                            >
                                <MaterialIcons name="phone" size={20} color="#16a34a" />
                                <Text className="text-green-700 dark:text-green-400 font-bold text-xs mt-1">Ligar</Text>
                            </TouchableOpacity>
                        </View>
                    )
                }

                {/* EVIDÊNCIAS */}
                {
                    delivery.status === 'PENDING' && (
                        <View className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
                            <Text className="text-slate-800 dark:text-slate-100 font-bold text-lg mb-4">Evidências</Text>

                            <View className="flex-row gap-3">
                                {/* SCANNER */}
                                <TouchableOpacity onPress={handleScan} className="flex-1">
                                    {scannedCode ? (
                                        <View className="w-full h-24 bg-green-50 dark:bg-green-900/30 rounded-lg items-center justify-center border border-green-200 dark:border-green-800">
                                            <MaterialIcons name="qr-code-2" size={24} color="#16a34a" />
                                            <Text className="text-green-700 dark:text-green-400 font-bold text-xs mt-2">Validado</Text>
                                            <Text className="text-green-600 dark:text-green-300 text-[10px] bg-white dark:bg-slate-800 px-2 py-1 rounded mt-1 overflow-hidden" numberOfLines={1}>
                                                {scannedCode}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                                            <MaterialIcons name="qr-code-scanner" size={24} color="#94a3b8" />
                                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] mt-2 text-center">Scan{'\n'}Produto</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* FOTO */}
                                <TouchableOpacity onPress={handleCamera} className="flex-1">
                                    {photo ? (
                                        <Image source={{ uri: photo }} className="w-full h-24 rounded-lg bg-slate-200" resizeMode="cover" />
                                    ) : (
                                        <View className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                                            <MaterialIcons name="camera-alt" size={24} color="#94a3b8" />
                                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] mt-2 text-center">Foto{'\n'}(Obrig.)</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* ASSINATURA */}
                                <TouchableOpacity onPress={() => setSignatureModalVisible(true)} className="flex-1">
                                    {signature ? (
                                        <Image source={{ uri: signature }} className="w-full h-24 rounded-lg bg-white border border-slate-200" resizeMode="contain" />
                                    ) : (
                                        <View className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                                            <FontAwesome5 name="signature" size={24} color="#94a3b8" />
                                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] mt-2">Assinar</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )
                }
            </ScrollView >

            {/* FOOTER ACTIONS */}
            {
                delivery.status === 'PENDING' && (
                    <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 p-6 border-t border-slate-100 dark:border-slate-800 flex-row gap-4 shadow-lg pb-10">
                        <TouchableOpacity
                            disabled={uploading}
                            className="flex-1 bg-red-50 dark:bg-red-900/30 py-4 rounded-xl items-center border border-red-100 dark:border-red-800 active:bg-red-100 dark:active:bg-red-900/50"
                            onPress={() => setFailureModalVisible(true)}
                        >
                            <Text className="text-red-600 dark:text-red-400 font-bold">Problema</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            disabled={uploading}
                            className={`flex-2 py-4 px-8 rounded-xl items-center shadow-md ${uploading ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'}`}
                            onPress={handleConfirmDelivery}
                        >
                            {uploading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold ml-2">Confirmar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )
            }

            {/* MODALS */}
            <SignatureModal
                visible={signatureModalVisible}
                onClose={() => setSignatureModalVisible(false)}
                onOK={handleSignature}
            />

            <Modal
                visible={failureModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setFailureModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 min-h-[50%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-slate-800 dark:text-slate-100">Reportar Problema</Text>
                            <TouchableOpacity onPress={() => setFailureModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-600 dark:text-slate-400 mb-2">Descreva o motivo:</Text>
                        <TextInput
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 min-h-[120px] text-base text-slate-800 dark:text-slate-100"
                            placeholder="Ex: Cliente ausente, endereço não localizado..."
                            placeholderTextColor="#94a3b8"
                            multiline
                            textAlignVertical="top"
                            value={failureReason}
                            onChangeText={setFailureReason}
                        />

                        <TouchableOpacity
                            onPress={handleFailureSubmit}
                            disabled={uploading}
                            className="bg-red-600 py-4 rounded-xl items-center mt-6 shadow-md"
                        >
                            {uploading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Registrar Ocorrência</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View >
    );
}
