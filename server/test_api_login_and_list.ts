import axios from 'axios';

const API_URL = 'http://localhost:3333/api';

async function test() {
  try {
    console.log('1. Tentando Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'joao@motorista.com',
      password: '123456',
      role: 'DRIVER', // O mobile envia isso? Vamos checar. O AuthController espera?
    });

    console.log('✅ Login Sucesso!');
    const token = loginRes.data.access_token;
    const driverId = loginRes.data.user.driverId;
    console.log(`Token obtido. DriverID na resposta: ${driverId}`);

    console.log('\n2. Buscando Entregas...');
    const listRes = await axios.get(`${API_URL}/deliveries/paginated`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 50 },
    });

    console.log(`✅ Status: ${listRes.status}`);
    console.log(`📦 Entregas encontradas: ${listRes.data.data.length}`);

    if (listRes.data.data.length === 0) {
      console.log(
        '⚠️ A lista retornou vazia. Verifique os filtros no Backend.',
      );
    } else {
      console.log(
        'Exemplo:',
        listRes.data.data[0].id,
        listRes.data.data[0].status,
      );
    }
  } catch (error: any) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

test();
