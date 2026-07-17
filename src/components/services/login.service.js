export const signIn = async (signUpData) => {
    try {
        const response = await fetch('http://127.0.0.1:3001/user/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(signUpData),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to sign in');
        }
        return data;
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
};