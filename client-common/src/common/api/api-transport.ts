import axios, { AxiosRequestConfig } from 'axios';
import { LocalStorage } from 'quasar';

const API_PREFIX = '/api/internal/';

export type QueryParams = { [k: string]: string|number|boolean };
export default class APITransport {
  readonly prefix;

  private readonly axios;

	// Do not access directly. Instead, use getAccessToken().
  private accessToken: string | null = null;

  constructor(prefix?: string) {
		this.prefix = prefix || API_PREFIX;
		this.axios = axios.create({ baseURL: this.prefix });
    this.accessToken = LocalStorage.getItem('accessToken');
  }

  hasAccessToken() {
    return this.accessToken !== null;
  }

	protected getAccessToken() {
		return this.accessToken;
	}

  setAccessToken(accessToken: string | null) {
    this.accessToken = accessToken;

    if (accessToken) {
      LocalStorage.set('accessToken', accessToken);
    } else {
      LocalStorage.remove('accessToken');
    }
  }

	atPath(path: string): APITransport {
		return new APISubTransport(this, path);
	}

	// Requests without an access token

	async get<R>(path: string, queryParams?: QueryParams): Promise<R> {
		return (await this.axios.get<R>(path, {
			params: queryParams
		})).data;
	}

	async post<R>(path: string, data: unknown): Promise<R> {
		return (await this.axios.post<R>(path, data)).data;
	}

	async put<R>(path: string, data: unknown): Promise<R> {
		return (await this.axios.put<R>(path, data)).data;
	}

	async delete<R>(path: string, queryParams?: QueryParams): Promise<R> {
		return (await this.axios.delete<R>(path, {
			params: queryParams
		})).data;
	}

	// Requests with an access token

	private getAuthConfig(queryParams?: QueryParams, requireToken = true): AxiosRequestConfig {
		const accessToken = this.getAccessToken();

		if (requireToken && !accessToken) {
			throw new Error();
		}

		return {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`
      } : {},
			params: queryParams
    }
	}

	// Token required

	async authGet<R>(path: string, queryParams?: QueryParams): Promise<R> {
		return (await this.axios.get<R>(path, this.getAuthConfig(queryParams))).data;
	}

	async authPost<R>(path: string, data: unknown, queryParams?: QueryParams): Promise<R> {
		return (await this.axios.post<R>(path, data, this.getAuthConfig(queryParams))).data;
	}

	async authPut<R>(path: string, data: unknown, queryParams?: QueryParams): Promise<R> {
		return (await this.axios.put<R>(path, data, this.getAuthConfig(queryParams))).data;
	}

	async authDelete<R>(path: string, queryParams?: QueryParams): Promise<R> {
		return (await this.axios.delete<R>(path, this.getAuthConfig(queryParams))).data;
	}

	// Token optional

	async tokenGet<R>(path: string, queryParams?: QueryParams): Promise<R> {
		return (await this.axios.get<R>(path, this.getAuthConfig(queryParams, false))).data;
	}
}

// Internal class used in the implementation of APITransport.atPath.
class APISubTransport extends APITransport {
	constructor(private parent: APITransport, path: string) {
		super(path.endsWith('/') ? `${API_PREFIX}${path}` : `${API_PREFIX}${path}/`);
	}

	hasAccessToken(): boolean {
		return this.parent.hasAccessToken();
	}

	protected getAccessToken(): string | null {
		// Hack. TypeScript refuses to call protected methods of the superclass. This does the right thing.
		return (this.parent as APISubTransport).getAccessToken();
	}

	setAccessToken(accessToken: string | null) {
		this.parent.setAccessToken(accessToken);
	}
}
