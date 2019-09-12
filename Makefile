
./node_modules:
	npm install

test:		./node_modules
	npm run build && npm run test

test-debug:	./node_modules
	npm run build &&					\
		DEBUG_LEVEL=silly				\
		WORKER_DEBUG_LEVEL=trace			\
		./node_modules/.bin/mocha -c --recursive ./tests

test-live:	./node_modules
	npm run build &&					\
		DEBUG_LEVEL=silly				\
		WORKER_DEBUG_LEVEL=trace			\
		TESTING_URL=http://cdn-ci.holohost.net		\
		./node_modules/.bin/mocha -c --recursive ./tests



.PHONY: test-ci
account_id	= 18ff2b4e6205b938652998cfca0d8cff
DNS2HASH	= 52f042f097ef447c94dc7f0009c70e19
HASH2CDN	= a117291ccd14434581f8ec26ba02fd5a
domain		= example.com
hash		= made_up_happ_hash_for_test
# ci-assets.holohost.net is CNAME'd to http://ec2-3-14-9-9.us-east-2.compute.amazonaws.com/
host		= ci-assets.holohost.net

test-ci:	wranger-ci.toml
	npm ci
	cp wrangler-ci.toml wrangler.toml

test-ci-setup:
	curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$(account_id)/storage/kv/namespaces/$(DNS2HASH)/values/$(domain)" \
	     -H "X-Auth-Email: $(CF_EMAIL)" \
	     -H "X-Auth-Key: $(CF_API_KEY)" \
	     -H "Content-Type: text/plain" \
	     --data "$(hash)" || echo "Failed to set DNS2HASH key $(domain)"
	echo "DNS2HASH key $(domain):"
	curl -X GET "https://api.cloudflare.com/client/v4/accounts/$(account_id)/storage/kv/namespaces/$(DNS2HASH)/values/$(domain)" \
	     -H "X-Auth-Email: $(CF_EMAIL)" \
	     -H "X-Auth-Key: $(CF_API_KEY)" \
	     -H "Content-Type: text/plain"

	curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$(account_id)/storage/kv/namespaces/$(HASH2CDN)/values/$(hash)" \
	     -H "X-Auth-Email: $(CF_EMAIL)" \
	     -H "X-Auth-Key: $(CF_API_KEY)" \
	     -H "Content-Type: text/plain" \
	     --data "[ \"$(host)\" ]" || echo "Failed to set HASH2CDN key $(hash)"
	echo "HASH2CDN key $(hash):"
	curl -X GET "https://api.cloudflare.com/client/v4/accounts/$(account_id)/storage/kv/namespaces/$(HASH2CDN)/values/$(hash)" \
	     -H "X-Auth-Email: $(CF_EMAIL)" \
	     -H "X-Auth-Key: $(CF_API_KEY)" \
	     -H "Content-Type: text/plain"
