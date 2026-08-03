import { useSocket } from "../socket/SocketContext"; // adatta il path
import { actions } from "../components/costants/const";

export const useSocketEmit = () => {
    const { socket } = useSocket(); // ← destrutturato

    const emit = (event, data) => {
        return new Promise((resolve, reject) => {
            if (!socket?.connected) {
                reject(new Error('Socket not connected'));
                return;
            }

            socket.emit(event, data, (response) => {
                console.log(response, 'RESPONSE');
                if (response.result.success) {
                    resolve(response.result.data);
                } else {
                    reject(new Error(response.result.error));
                }
            });
        });
    };

    const listTodos = async () => {
        const todos = await emit('todos:list');
        console.log(todos);
        return todos;
    };

    const listPosts = async () => {
        return await emit(actions.LIST_POST);
    };
    const likePost = async (postId) => emit(actions.LIKE_POST, { postId });
    const addComment = async (postId, comment) => emit(actions.COMMENT_POST, { postId, comment });
    const deleteComment = async (commentId) => emit(actions.COMMENT_DELETE, commentId);

    return {
        listTodos,
        listPosts,
        likePost,
        addComment,
        deleteComment
    };


};