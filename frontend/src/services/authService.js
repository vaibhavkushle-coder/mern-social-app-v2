import api from "./api"

async function login(data){
    return await api.post("/auth/login",data);
}

async function register(data){
    return await api.post("/auth/register",data);
}

async function logout(){
    return await api.post("/auth/logout");
}

async function getAuthRateLimitStatus(action) {
    return await api.get(`/auth/rate-limit/${action}`);
}

export { login, register, logout, getAuthRateLimitStatus }
