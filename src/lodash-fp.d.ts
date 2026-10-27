// Native ESM uses lodash/fp.js; DefinitelyTyped declares the same export as lodash/fp.
declare module 'lodash/fp.js' {
	import fp from 'lodash/fp'
	export default fp
}
