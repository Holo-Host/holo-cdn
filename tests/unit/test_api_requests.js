const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const fs				= require('fs');
const expect				= require('chai').expect;
const axios				= require('axios');
const Cloudworker			= require('@dollarshaveclub/cloudworker');
const { Response }			= Cloudworker;
      
const worker_code			= fs.readFileSync('./dist/worker.js', 'utf8');

const domain				= "example.com";
const hash				= "made_up_happ_hash_for_test";
const host_list				= [
    "made_up_host_agent_id_for_test.holohost.net",
];


async function setup_for_cloudworker () {
    const bindings			= {
	//
	// Key value store for getting the hApp hash by domain name (DNS)
	//
	"DNS2HASH": new Cloudworker.KeyValueStore(),

	//
	// Key value store for getting a list of hosts by hApp hash
	//
	"HASH2CDN": new Cloudworker.KeyValueStore(),
    };

    const cw				= (new Cloudworker( worker_code, { bindings } )).context;

    const methods			= [
	"handleRequest", "Request", "DNS2HASH", "HASH2CDN",
    ];

    Object.assign( global, Object.fromEntries( methods.map(n => [n, cw[n]]) ));

    cw.log.setLevel( process.env.WORKER_DEBUG_LEVEL || 'error' );
    
    await DNS2HASH.put( domain, hash );
    await HASH2CDN.put( hash, JSON.stringify( host_list ) );
}

async function setup_for_service_worker ( staging_url ) {
    global.Request = function Request ( url, config ) {
	this.url = url;
	this.config = config;
    }
    
    global.handleRequest = async function ( req ) {
	let response;
	try {
	    response			= await axios({
		"url": staging_url,
		"method": req.config.method || "GET",
		"transformResponse": null,
		"data": req.config.body,
		"headers": req.config.headers,
	    });
	} catch ( err ) {
	    log.error("%s", String(err) );
	    response			= err.response;
	}

	return new Response( response.data, {
	    "status": response.status,
	    "headers": response.headers,
	});
    }
}


before(async function () {
    if ( process.env.TESTING_URL )
	await setup_for_service_worker( process.env.TESTING_URL );
    else
	await setup_for_cloudworker();
});



describe("Worker Test", function() {

    it('should respond to preflight check', async function () {
	let req				= new Request('https://worker.example.com/', {
	    "method": "OPTIONS",
	    "headers": {
		"Access-Control-Request-Method": "DELETE",
		"Access-Control-Request-Headers": "origin, x-requested-with",
		"Origin": "https://worker.example.com",
	    },
	});
	log.silly("%s", req );
	
	let resp			= await handleRequest( req );
	let headers			= resp.headers;
	log.debug("%s", resp );

	expect( resp.status					).equal( 204 );
	expect( headers.get("Access-Control-Allow-Origin")	).equal( "*" );
	expect( headers.get("Access-Control-Allow-Methods")	).to.be.a('string');
	expect( headers.get("Access-Control-Allow-Headers")	).to.be.a('string');
	expect( headers.get("Access-Control-Max-Age")		).to.be.a('string');
    })

    // it('send post data in urlencoded form', async function () {
    // 	let req				= new Request('https://worker.example.com/', {
    // 	    "method": "POST",
    // 	    "body": JSON.stringify({
    // 		"url": domain,
    // 	    }),
    // 	    "headers": {
    // 		"Content-Type": "application/x-www-form-urlencoded",
    // 	    },
    // 	});
    // 	log.silly("%s", req );
	
    // 	let resp			= await handleRequest( req );
    // 	log.debug("%s", resp );
    // 	let body			= await resp.json();
	
    // 	expect( body ).deep.equal({
    // 	    "hash": hash,
    // 	    "hosts": host_list,
    // 	    "requestURL": domain,
    // 	});
    // })

    // it('Send empty url', async function () {
    // 	let req				= new Request('https://worker.example.com/', {
    // 	    "method": "POST",
    // 	    "body": JSON.stringify({
    // 		"url": "",
    // 	    }),
    // 	    "headers": {
    // 		"Content-Type": "application/x-www-form-urlencoded",
    // 	    },
    // 	});
    // 	log.silly("%s", req );
	
    // 	let resp			= await handleRequest( req );
    // 	log.debug("%s", resp );
    // 	let body			= await resp.json();

    // 	expect( resp.status ).equal( 400 );
    // 	expect( body.error ).equal( "Missing required input" );
    // });

    // it('send post data in JSON form', async function () {
    // 	let req				= new Request('https://worker.example.com/', {
    // 	    "method": "POST",
    // 	    "body": JSON.stringify({
    // 		"url": domain,
    // 	    }),
    // 	    "headers": {
    // 		"Content-Type": "application/json",
    // 	    },
    // 	});
	
    // 	let resp			= await handleRequest( req );
    // 	let body			= await resp.json();
	
    // 	assert.deepEqual( body, {
    // 	    "hash": hash,
    // 	    "hosts": host_list,
    // 	    "requestURL": domain,
    // 	});
    // })

});