
import { logging }	from '@holo-host/service-worker-logger';

const log		= logging.getLogger('static-assets');
log.setLevel('error');


addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest ( request ) {
    log.info('Got request %s', request );

    if ( request.headers.get("Origin")				!== null &&
	 request.headers.get("Access-Control-Request-Method")	!== null &&
	 request.headers.get("Access-Control-Request-Headers")	!== null ) {
	return new Response( null, {
	    "status": 204,
	    "headers": {
		"Access-Control-Allow-Origin":	"*",
		"Access-Control-Allow-Methods":	"GET, HEAD, POST, OPTIONS",
		"Access-Control-Allow-Headers":	"",
		"Access-Control-Max-Age":	86400,
	    }
	});
    }
    
    return new Response( JSON.stringify({
	"error": "Bad Request",
	"message": "We don't know what you want.  Try following the API documentation...",
    }), {
	"status": 400,
	"headers": {
	    "Content-Type": "application/json",
	}
    });
}

export {
    log,
    handleRequest,
};
