import axios from 'axios';

async function testLogin() {
    try {
        console.log('Testing login...');
        const response = await axios.post('http://localhost:4000/api/auth/login', {
            email: 'dvytvytskyi@gmail.com',
            password: process.env.TEST_PASSWORD ?? ''
        });
        console.log('Login Status:', response.status);
        console.log('Success:', response.data.success);
        console.log('Has Token:', !!response.data.data?.token);
        console.log('Has Refresh Token:', !!response.data.data?.refreshToken);
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            console.log('Connection refused - Server is likely down');
        } else {
            console.log('Login Failed:', error.response?.status, error.response?.data);
        }
        process.exit(1);
    }
}

testLogin();
