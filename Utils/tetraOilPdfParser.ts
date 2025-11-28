import * as pdfjsLib from 'pdfjs-dist';

// Interface para o retorno limpo
export interface ExtractedDelivery {
    invoiceNumber: string;
    customerName: string;
    customerAddress: string;
    volume: number;
    weight: number;
    value: number;
    priority: 'NORMAL' | 'HIGH' | 'URGENT';
    product: string;
    salesperson: string;
}

export interface PdfParseResult {
    routeData: {
        name: string;
        date: string;
        vehiclePlate: string;
        driverName: string;
    };
    deliveries: ExtractedDelivery[];
}

export const parseTetraOilPdf = async (arrayBuffer: ArrayBuffer): Promise<PdfParseResult> => {
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";

    // 1. Extração de Texto preservando quebras visuais
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const strings = textContent.items.map((item: any) => item.str);
        
        // Unir com um caractere especial para facilitar regex
        fullText += strings.join(" | ") + "\n";
    }

    // 2. Extração do Cabeçalho
    const driverMatch = fullText.match(/Motorista:[\s\|]*([A-Z\s]+)/i);
    const vehicleMatch = fullText.match(/Veículo:[\s\|]*([A-Z0-9]+)/i);
    // Tenta capturar data. Ex: "27 de novembro"
    const dateMatch = fullText.match(/Previsão início:[\s\|]*([\d\w\s\/]+)/i);

    const driverName = driverMatch ? driverMatch[1].split('|')[0].trim() : "";
    const vehiclePlate = vehicleMatch ? vehicleMatch[1].trim() : "";
    
    // Tratamento de Data (Simplificado para ISO)
    const routeDate = new Date().toISOString(); 
    
    const routeData = {
        name: `Rota PDF - ${vehiclePlate} - ${driverName.split(' ')[0] || 'Diário'}`,
        date: routeDate,
        vehiclePlate,
        driverName
    };

    // 3. Extração da Tabela
    const deliveries: ExtractedDelivery[] = [];

    // Regex ajustada para capturar Cliente, Cidade, Vendedor e Produto
    const rowRegex = /(\d{6})[\s\|]+(.*?)(?:[\s\|]+)(MARANGUAPE|FORTALEZA|CAUCAIA|EUSEBIO|AQUIRAZ|HORIZONTE|PACAJUS|ITAV\.?|SAO GONCALO|PARACURU|PARAIPABA|TRAIRI|ITAPIPOCA|SOBRAL|TIANGUA|CRATEUS|TAUA|IGUATU|JUAZEIRO|CRATO|BARBALHA|BREJO SANTO|RUSSAS|LIMOEIRO|ARACATI|CASCAVEL|BEBERIBE|MORADA NOVA|QUIXADA|QUIXERAMOBIM|CANINDE|BATURITE|REDENCAO|ACARAPE|PACATUBA|GUAIUBA|ITAITINGA|MARACANAU|CHOROZINHO)[\s\|]+([A-Z\s\.]+?)[\s\|]+(S10 COMUM|GASOLINA|DIESEL.*?|ETANOL.*?)[\s\|]+.*?([\d\.]+,\d{2})/gi;

    let match;
    while ((match = rowRegex.exec(fullText)) !== null) {
        const invoice = match[1];
        const rawClientBlock = match[2].trim();
        const city = match[3].trim(); 
        const salesperson = match[4].trim();
        const product = match[5].trim();
        const volumeStr = match[6];

        // Separação Nome vs Endereço usando o delimitador inserido |
        const clientParts = rawClientBlock.split('|').map(s => s.trim()).filter(s => s.length > 0);
        
        let customerName = "Cliente Desconhecido";
        let customerAddress = "Endereço não identificado";

        if (clientParts.length > 0) {
            customerName = clientParts[0]; // Primeira linha é o Nome
            
            if (clientParts.length > 1) {
                // Junta o restante como endereço
                customerAddress = clientParts.slice(1).join(", ");
            } else {
                customerAddress = customerName; 
            }
        }

        // Adiciona a Cidade ao endereço para garantir geocodificação
        const fullAddress = `${customerAddress} - ${city}`;

        deliveries.push({
            invoiceNumber: invoice,
            customerName: customerName,
            customerAddress: fullAddress, 
            volume: parseFloat(volumeStr.replace('.', '').replace(',', '.')),
            weight: 0,
            value: 0, 
            priority: 'NORMAL',
            product: product,
            salesperson: salesperson
        });
    }

    if (deliveries.length === 0) {
        throw new Error("Nenhum pedido identificado. Verifique se o PDF é do padrão 'Diário de Viagem'.");
    }

    return { routeData, deliveries };
};