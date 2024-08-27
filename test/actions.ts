const API_URL =
  " https://igrwydbv71.execute-api.eu-north-1.amazonaws.com/prod/";

interface Permission {
  username: string;
  actions: string;
}

export async function login(
  username: string,
  password: string
): Promise<string> {
  const response = await fetch(`${API_URL}/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  const token = data.AuthenticationResult.IdToken;

  return token;
}

export async function signup(
  username: string,
  email: string,
  password: string
): Promise<string> {
  const response = await fetch(`${API_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await response.json();
  console.log(data);
  return response.statusText;
}

export async function createNote(
  title: string,
  content: string,
  token: string
): Promise<string> {
  const response = await fetch(`${API_URL}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ title, content }),
  });

  const data = await response.json();
  console.log(data);
  return response.statusText;
}

export async function createPermissions(
  title: string,
  permissions: Permission[],
  token: string
): Promise<string> {
  const response = await fetch(`${API_URL}/notes/${title}/permissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ permissions }),
  });

  const data = await response.json();
  console.log(data);
  return response.statusText;
}

export async function getNote(title: string, owner: string, token: string) {
  const response = await fetch(`${API_URL}/shared-notes/${owner}/${title}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
  });

  const data = await response.json();
  console.log(data);
  return data.Item;
}
