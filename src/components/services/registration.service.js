export const signUp = async (signUpData) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/user`, {
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