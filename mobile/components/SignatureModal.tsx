import React, { useRef } from 'react';
import { View, StyleSheet, Modal, Text, TouchableOpacity } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';

interface SignatureModalProps {
    visible: boolean;
    onClose: () => void;
    onOK: (signature: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ visible, onClose, onOK }) => {
    const ref = useRef<SignatureViewRef>(null);

    const handleOK = (signature: string) => {
        onOK(signature); // signature is base64 string
        onClose();
    };

    const handleClear = () => {
        ref.current?.clearSignature();
    };

    const handleConfirm = () => {
        ref.current?.readSignature();
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Coletar Assinatura</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.signatureContainer}>
                    <SignatureScreen
                        ref={ref}
                        onOK={handleOK}
                        webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
                    />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={handleClear} style={[styles.button, styles.clearButton]}>
                        <Text style={styles.clearButtonText}>Limpar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleConfirm} style={[styles.button, styles.confirmButton]}>
                        <Text style={styles.confirmButtonText}>Confirmar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        marginTop: 40,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    closeText: {
        color: '#ef4444',
        fontSize: 16,
    },
    signatureContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        margin: 16,
        borderRadius: 8,
        overflow: 'hidden',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        marginBottom: 20,
    },
    button: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    clearButton: {
        backgroundColor: '#f1f5f9',
    },
    confirmButton: {
        backgroundColor: '#2563eb',
    },
    clearButtonText: {
        color: '#64748b',
        fontWeight: 'bold',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
