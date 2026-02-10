// src/components/Login.js
import React from "react";
import { useAuth } from "react-oidc-context"; // Importa da biblioteca AWS

function Login() {
  const auth = useAuth();

  if (auth.isLoading) return <div>A carregar login da AWS...</div>;

  if (auth.isAuthenticated) {
    return (
      <div>
        <p>Bem-vindo, {auth.user?.profile.email}</p>
        <button onClick={() => auth.removeUser()}>Sair</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Login Energético</h1>
      <button onClick={() => auth.signinRedirect()}>Entrar com AWS Cognito</button>
    </div>
  );
}

export default Login;