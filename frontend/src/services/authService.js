import api from "./api"

async function login(data){
    return await api.post("/auth/login",data);
}

async function register(data){
    return await api.post("/auth/register",data);
}


export { login, register }