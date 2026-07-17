import { combineReducers } from "@reduxjs/toolkit";
import { userSlice } from "./user.slice.js";

export const reducers = combineReducers({
  user: userSlice.reducer, // ✅ .reducer (senza la s)
});