class ApiClient {
    public constructor(public readonly baseUrl: URL) {
    }

    /**
     * Get API server info
     */
    public async info() {
        return await this.fetch<ApiClient.ApiServer>(new ApiClient.ApiRequest(this, "/"));
    }

    /**
     * List artists
     * @param [limit] Number of resources to return per page. >= 1, default 100
     * @param [page] Page number to return. >= 1, default 1
     */
    public async listArtists(limit?: number, page?: number) {
        const query = new URLSearchParams();
        if (limit !== undefined) query.set("limit", limit.toString());
        if (page !== undefined) query.set("page", page.toString());
        return await this.fetch<ApiClient.Page<ApiClient.Artist>>(new ApiClient.ApiRequest(this, "/artists", query));
    }

    /**
     * Get multiple artists by ID
     * @params ids Up to 100 artist IDs to get at once
     * @returns The response is always a single page.
     */
    public async getArtists(ids: string[]) {
        const usp = new URLSearchParams();
        for (const id of ids) usp.append("id", id);
        return await this.fetch<ApiClient.Page<ApiClient.Artist>>(new ApiClient.ApiRequest(this, "/artists", usp));
    }

    /**
     * Get artist by ID
     * @param id Artist ID
     */
    public async getArtist(id: string) {
        return await this.fetch<ApiClient.Artist>(new ApiClient.ApiRequest(this, `/artists/${id}`));
    }

    /**
     * List artist's albums
     * @param id Artist ID
     * @param [limit] Number of resources to return per page. >= 1, default 100
     * @param [page] Page number to return. >= 1, default 1
     */
    public async listArtistAlbums(id: string, limit?: number, page?: number) {
        const query = new URLSearchParams();
        if (limit !== undefined) query.set("limit", limit.toString());
        if (page !== undefined) query.set("page", page.toString());
        return await this.fetch<ApiClient.Page<ApiClient.Album>>(new ApiClient.ApiRequest(this, `/artists/${id}/albums`, query));
    }

    /**
     * List artist's tracks
     * @param id Artist ID
     * @param [limit] Number of resources to return per page. >= 1, default 100
     * @param [page] Page number to return. >= 1, default 1
     */
    public async listArtistTracks(id: string, limit?: number, page?: number) {
        const query = new URLSearchParams();
        if (limit !== undefined) query.set("limit", limit.toString());
        if (page !== undefined) query.set("page", page.toString());
        return await this.fetch<ApiClient.Page<ApiClient.Track>>(new ApiClient.ApiRequest(this, `/artists/${id}/tracks`, query));
    }

    /**
     * List albums
     * @param [limit] Number of resources to return per page. >= 1, default 100
     * @param [page] Page number to return. >= 1, default 1
     */
    public async listAlbums(limit?: number, page?: number) {
        const query = new URLSearchParams();
        if (limit !== undefined) query.set("limit", limit.toString());
        if (page !== undefined) query.set("page", page.toString());
        return await this.fetch<ApiClient.Page<ApiClient.Album>>(new ApiClient.ApiRequest(this, "/albums", query));
    }

    /**
     * Get album by ID
     * @param id Album ID
     */
    public async getAlbum(id: string) {
        return await this.fetch<ApiClient.Album>(new ApiClient.ApiRequest(this, `/albums/${id}`));
    }

    /**
     * List tracks in album
     * @param id Album ID
     * @param [limit] Number of resources to return per page. >= 1, default 100
     * @param [page] Page number to return. >= 1, default 1
     */
    public async listAlbumTracks(id: string, limit?: number, page?: number) {
        const query = new URLSearchParams();
        if (limit !== undefined) query.set("limit", limit.toString());
        if (page !== undefined) query.set("page", page.toString());
        return await this.fetch<ApiClient.Page<ApiClient.Track>>(new ApiClient.ApiRequest(this, `/albums/${id}/tracks`, query));
    }

    /**
     * List tracks
     * @param [limit] Number of resources to return per page. >= 1, default 100
     * @param [page] Page number to return. >= 1, default 1
     * @param [sort] Sort parameter and direction, e.g. "title:asc"
     */
    public async listTracks(limit?: number, page?: number, sort?: `${"title" | "year" | "track_no" | "duration"}:${"asc" | "desc"}`) {
        const query = new URLSearchParams();
        if (limit !== undefined) query.set("limit", limit.toString());
        if (page !== undefined) query.set("page", page.toString());
        if (sort !== undefined) query.set("sort", sort);
        return await this.fetch<ApiClient.Page<ApiClient.Track>>(new ApiClient.ApiRequest(this, "/tracks", query));
    }

    /**
     * Get track by ID
     * @param id Track ID
     */
    public async getTrack(id: string) {
        return await this.fetch<ApiClient.Track>(new ApiClient.ApiRequest(this, `/tracks/${id}`));
    }

    /**
     * @private
     * @internal
     */
    private async fetch<T>(req: ApiClient.ApiRequest) {
        return await ApiClient.ApiResponse.from<T>(req, await req.fetch());
    }
}

namespace ApiClient {
    export class ApiResponse<T> {
        public constructor(public readonly req: ApiRequest, public readonly res: Response, public readonly body: T) {
        }

        /**
         * @throws {ApiClient.ApiError} When a well-formed error is returned by the API
         * @throws {Error} Request failed and error response body cannot be understood
         */
        public static async from<T>(req: ApiRequest, res: Response) {
            const body = await res.json();
            if (!res.ok) {
                if ("error" in body && typeof body === "object" && "message" in body.error)
                    throw new ApiError(new ApiResponse(req, res, body));
                else throw new Error(`Unknown error response received. status=${res.status} body=${JSON.stringify(body)}`);
            }
            return new ApiResponse<T>(req, res, body);
        }
    }

    export class ApiError extends Error {
        public constructor(public readonly res: ApiResponse<{ error: { message: string } }>) {
            super(res.body.error.message);
        }
    }

    export class ApiRequest {
        public readonly url: URL;
        public readonly headers: Headers;
        public readonly method: string;
        public readonly body: ApiClient.Body | null = null;

        public constructor(public readonly api: ApiClient, path: string, query: URLSearchParams = new URLSearchParams(), headersInit: HeadersInit = {}, method = "GET", body?: ApiClient.Body) {
            this.url = ApiRequest.concatUrl(api.baseUrl, path);
            this.url.search = query.toString();
            this.headers = new Headers(headersInit);
            this.method = method;
            if (body !== undefined && method !== "GET" && method !== "HEAD") {
                this.headers.delete("content-type");
                this.headers.set("content-type", body.contentType);
                this.body = body;
            }
        }

        public static concatUrl(baseUrl: URL, path: string) {
            baseUrl.pathname = baseUrl.pathname + (baseUrl.pathname.endsWith("/") && path.startsWith("/") ? path.slice(1) : path);
            return baseUrl;
        }

        public async fetch() {
            return await fetch(this.url, {method: this.method, headers: this.headers, body: this.body?.body});
        }
    }

    export class Body {
        public constructor(public readonly contentType: string, public readonly body: BodyInit) {
        }
    }

    export class JsonBody extends Body {
        public constructor(json: any) {
            super("application/json", JSON.stringify(json));
        }
    }

    export interface Page<T> {
        /**
         * Current page
         */
        page: number;
        /**
         * Number of resources per page
         */
        limit: number;
        /**
         * Total number of resources in the library
         */
        total: number;
        /**
         * This request's path and params
         */
        href: string;
        /**
         * Path to the previous page; null if this is the first page
         */
        previous: string | null;
        /**
         * Path to the next page, null if this is the last page
         */
        next: string | null;
        /**
         * Resources
         */
        resources: T[];
    }

    export interface ApiServer {
        prelude: {
            version: `${number}.${number}.${number}${`-${string}` | ""}`,
            spec: {
                json: "openapi.json",
                yaml: "openapi.yaml"
            }
        }
    }

    export interface Artist {
        /**
         * Artist ID
         */
        id: string;
        /**
         * Name of the artist
         */
        name: string;
        /**
         * Artist image URL
         */
        image: string | null;
    }

    export interface Album {
        /**
         * Album ID
         */
        id: string;
        /**
         * Album name
         */
        name: string;
        /**
         * Artist ID
         */
        artist: string;
    }

    export interface Track {
        /**
         * Track ID
         */
        id: string;
        /**
         * Track title
         */
        title: string;
        /**
         * Artist ID
         */
        artist: string;
        /**
         * Album ID
         */
        album: string | null;
        /**
         * Track year
         */
        year: number | null;
        /**
         * Track genres
         */
        genres: string[];
        /**
         * Track number and total tracks in album
         */
        track: { no: number, of: number | null } | null;
        /**
         * Disk number and total disks
         */
        disk: { no: number, of: number | null } | null;
        /**
         * Track duration
         */
        duration: number;
        /**
         * Track meta
         */
        meta: {
            /**
             * Number of audio channels
             */
            channels: number;
            /**
             * Sample rate in Hz
             */
            sampleRate: number;
            /**
             * Bitrate in bits per second
             */
            bitrate: number;
            /**
             * Whether the audio file is in a lossless/uncompressed format
             */
            lossless: boolean;
        }
    }
}

export default ApiClient;
