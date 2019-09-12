
import { logging }	from '@holo-host/service-worker-logger';

const log		= logging.getLogger('static-assets');
log.setLevel('error');



function json_response ( data, status=200, header=null ) {
    return new Response(
	JSON.stringify( data ),
	Object.assign( header || {}, {
	    "status": status,
	    "headers": {
		"Content-Type": "application/json",
	    },
	}),
    );
}



addEventListener('fetch', event => {
    try {
	const res		= handleRequest( event.request );
	event.respondWith( res );
    } catch ( err ) {
	event.respondWith( json_response({
	    "error": "Internal Server Error",
	    "message": String(err),
	}, 500) );
    }
})


//
// Example of browser HTTP request for a provider's CNAME'd domain
// ```http
// GET / HTTP/1.1
// Host: holofuel-demo.holohost.net
// Connection: keep-alive
// Pragma: no-cache
// Cache-Control: no-cache
// Upgrade-Insecure-Requests: 1
// User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36
// Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3
// Accept-Encoding: gzip, deflate
// Accept-Language: en-US,en;q=0.9,de;q=0.8,fr;q=0.7
// Cookie: __cfduid=df90a7bc4a455fed7f0c9c28a3db3c3681562682657
// ```
// 
// Example response
// ```http
// HTTP/1.1 200 OK
// Date: Wed, 11 Sep 2019 15:49:37 GMT
// Content-Type: text/html
// Transfer-Encoding: chunked
// Connection: keep-alive
// Last-Modified: Thu, 27 Jun 2019 16:58:36 GMT
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Methods: GET, POST, OPTIONS
// Access-Control-Allow-Headers: *
// Server: cloudflare
// CF-RAY: 514acaee38edbb34-SEA
// Content-Encoding: gzip
// ```

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest ( request ) {
    const method		= request.method;
    const headers		= request.headers;
    
    const host			= headers.get('host');
    const origin		= headers.get('origin');
    const referer		= headers.get('referer');
    
    const url			= new URL( request.url );
    const path			= url.pathname;

    log.info('Got request %s %s from origin %s', method, path, origin );

    if ( origin						!== null &&
	 headers.get("access-control-request-method")	!== null &&
	 headers.get("access-control-request-headers")	!== null ) {
	return new Response( null, {
	    "status": 204,
	    "headers": {
		"Access-Control-Allow-Origin":	"*",
		"Access-Control-Allow-Methods":	"GET, OPTIONS",
		"Access-Control-Allow-Headers":	"*",
		"Access-Control-Max-Age":	86400,
	    }
	});
    }

    if ( method !== "GET" ) {
	return json_response({
	    "error": "Method Not Allowed",
	    "message": "Only the GET method is supported for static assets",
	}, 405 );
    }
    else if ( host === null ) {
	return json_response({
	    "error": "Bad Request",
	    "message": "Host header is missing.  Required for hApp ID lookup",
	}, 400 );
    }

    try {
	// Valid host check
	if ( (new URL( "http://" + host )).host !== host )
	    throw new Error("Host header is a valid URL but an invalid host: " + host );
    } catch ( err ) {
	return json_response({
	    "error": "Bad Request",
	    "message": "Host header is: " + String(err),
	}, 400 );
    }


    const host_url		= new URL( "http://" + host );
    const hostname		= host_url.hostname;
    const happ_id		= await DNS2HASH.get( hostname );

    if ( happ_id === null ) {
	return json_response({
	    "error": "Resource Not Found",
	    "message": "There is no hApp registered for host '" + host + "'",
	}, 404 );
    }

    const tranche		= await HASH2CDN.get( happ_id, "json" );

    if ( tranche === null ) {
	return json_response({
	    "error": "Resource Not Found",
	    "message": "There is no tranche for hApp ID '" + happ_id + "'",
	}, 404 );
    }

    const random_node_domain	= tranche[ Math.floor(Math.random() * tranche.length) ];
    const static_asset_url	= "http://" + random_node_domain + path;
    
    log.info("Fetch GET %s", static_asset_url );
    return await fetch( static_asset_url );
}

export {
    log,
    handleRequest,
};
