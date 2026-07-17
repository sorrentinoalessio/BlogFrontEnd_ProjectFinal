export const signUp = async (signUpData) => {
    try {
        const response = await fetch('http://127.0.0.1:3001/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(signUpData),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to sign up');
        }
        return data;
    } catch (error) {
        console.error('Error signing up:', error);
        throw error;
    }
};