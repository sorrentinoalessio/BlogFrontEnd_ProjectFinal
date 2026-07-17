import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  name: "",
  accessToken: "",
  refreshToken: "",
};
export const userSlice = createSlice({
  name: "user",
  initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
        },
        clearUser: (state) => {
            state.user = initialState.user;
        },
    },
});
export const { setUser, clearUser } = userSlice.actions;

export const userSelectors = {
    selectUser: (state) => state.user,
};
