import { scopes, getAllScopes } from './scopes.js';

const TTL = {
  AccessToken: 60 * 60,
  AuthorizationCode: 10 * 60,
  IdToken: 60 * 60,
  RefreshToken: 14 * 24 * 60 * 60,
  ClientCredentials: 10 * 60,
  Interaction: 60 * 60,
  Session: 14 * 24 * 60 * 60,
  Grant: 14 * 24 * 60 * 60,
};

const settings = {

  /* ------------------------------- PKCE ------------------------------- */
  pkce: {
    methods: ['S256'],
    required: () => true,
  },

  /* ------------------------------ FEATURES ---------------------------- */
  features: {
    revocation: { enabled: true },
    introspection: { enabled: true },

    userinfo: { enabled: true },

    registration: { enabled: false },

    clientCredentials: { enabled: true },

    pushedAuthorizationRequests: { enabled: false },

    encryption: { enabled: false },
  },

  /* ---------------------------- CLAIMS ---------------------------- */
  // Map từ scope -> các claims thuộc scope đó
  claims: Object.entries(scopes).reduce((acc, [scope, def]) => {
    if (def.claims && def.claims.length) {
      acc[scope] = def.claims.reduce((claimsObj, claimName) => {
        claimsObj[claimName] = null;
        return claimsObj;
      }, {});
    }
    return acc;
  }, {}),

  /* ---------------------------- COOKIES ---------------------------- */
  cookies: {
    keys: process.env.COOKIE_KEYS?.split(',') || ['secret-key-1', 'secret-key-2'],
    long: {
      signed: true,
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    },
    short: {
      signed: true,
      maxAge: 10 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    },
  },

  ttl: TTL,

  responseTypes: ['code', 'code id_token'],

  grantTypes: [
    'authorization_code',
    'refresh_token',
    'client_credentials',
  ],

  scopes: getAllScopes(),

  subjectTypes: ['public'],

  tokenEndpointAuthMethods: [
    'client_secret_basic',
    'client_secret_post',
    'client_secret_jwt',
    'private_key_jwt',
    'none',
  ],

  /* ---------------------------- ROUTES ---------------------------- */
  routes: {
    authorization: '/authorize',
    token: '/token',
    userinfo: '/userinfo',
    revocation: '/revoke',
    introspection: '/introspect',
    end_session: '/logout',
    jwks: '/jwks.json',
  },

  interactions: {
    url: async (ctx, interaction) => `/interaction/${interaction.uid}`,
  },

  renderError: async (ctx, out, error) => {
    ctx.type = 'html';
    ctx.body = `
      <html><body>
        <h1>${error.name}</h1>
        <p>${error.message}</p>
      </body></html>
    `;
  },

  formats: {
    AccessToken: 'jwt',
    ClientCredentials: 'jwt',
  },

  jwks: undefined,
  findAccount: undefined,
  adapter: undefined,

  extraTokenClaims: async () => ({}),

  issueRefreshToken: async (ctx, client, code) => {
    if (!code) return false;
    return code.scopes.has('offline_access');
  },

  rotateRefreshToken: true,

  extraClientMetadata: {
    properties: ['logo_uri', 'policy_uri', 'tos_uri'],
  },

  clientBasedCORS: () => true,

  httpOptions: (options) => {
    options.timeout = 5000;
    return options;
  },
};

export default settings;
