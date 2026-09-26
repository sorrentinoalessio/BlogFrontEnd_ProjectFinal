import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  name: "",
  accessToken: "",
  refreshToken: "",
  avatar: "",
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.name = action.payload.name ?? state.name;
      state.userId = action.payload.userId ?? state.userId;
      state.accessToken = action.payload.accessToken ?? state.accessToken;
      state.refreshToken = action.payload.refreshToken ?? state.refreshToken;
      state.avatar = action.payload.avatar ?? state.avatar;
    },
    clearUser: () => {
      return initialState;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;

export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
};

export const userSelectors = {
  selectUser: (state) => state.user,
};

export default userSlice.reducer;