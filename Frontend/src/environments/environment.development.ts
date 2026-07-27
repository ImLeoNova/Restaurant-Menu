interface Environment {
  production: boolean;
  websiteAPI: string;
  aiAPI: string;
}

export const environment: Environment = {
  production: false,
  websiteAPI: 'http://localhost:8080',
  aiAPI: 'http://localhost:8080/api/user/ai',
};
