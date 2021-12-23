// This is the main file for the Netlify Build plugin netligraph.
// Please read the comments to learn more about the Netlify Build plugin syntax.
// Find more information in the Netlify documentation.
import { extractFunctionsFromOperationDoc, fetchOneGraphSchema, generateFunctionsFile, fetchEnabledServices, readAndParseGraphQLOperationsSourceFile, readGraphQLOperationsSourceFile, upsertAppForSite } from "./netligraph.mjs"
import fs from "fs"
import { parse } from 'graphql'

/* eslint-disable no-unused-vars */
export default {
  // The plugin main logic uses `on...` event handlers that are triggered on
  // each new Netlify Build.
  // Anything can be done inside those event handlers.
  // Information about the current build are passed as arguments. The build
  // configuration file and some core utilities are also available.
  async onPreBuild({
    // Whole configuration file. For example, content of `netlify.toml`
    netlifyConfig,
    // Users can pass configuration inputs to any plugin in their Netlify
    // configuration file.
    // For example:
    //
    //   [[plugins]]
    //   package = "netlify-plugin-netligraph"
    //     [plugins.inputs]
    //     foo = "bar"
    inputs,
    // `onError` event handlers receive the error instance as argument
    error,

    // Build constants
    constants,
    // Core utilities
    utils: {
      // Utility to report errors.
      // See https://github.com/netlify/build#error-reporting
      build,
      // Utility to display information in the deploy summary.
      // See https://github.com/netlify/build#logging
      status,
      // Utility for caching files.
      // See https://github.com/netlify/build/blob/master/packages/cache-utils#readme
      cache,
      // Utility for running commands.
      // See https://github.com/netlify/build/blob/master/packages/run-utils#readme
      run,
      // Utility for dealing with modified, created, deleted files since a git commit.
      // See https://github.com/netlify/build/blob/master/packages/git-utils#readme
      git,
      // Utility for handling Netlify Functions.
      // See https://github.com/netlify/build/tree/master/packages/functions-utils#readme
      functions,
    },
  }) {
    const {
      // Path to the Netlify configuration file. `undefined` if none was used
      CONFIG_PATH,
      // Directory that contains the deploy-ready HTML files and assets
      // generated by the build. Its value is always defined, but the target
      // might not have been created yet.
      PUBLISH_DIR,
      // The directory where function source code lives.
      // `undefined` if not specified by the user.
      FUNCTIONS_SRC,
      // The directory where built serverless functions are placed before
      // deployment. Its value is always defined, but the target might not have
      // been created yet.
      FUNCTIONS_DIST,
      // Boolean indicating whether the build was run locally (Netlify CLI) or
      // in the production CI
      IS_LOCAL,
      // Version of Netlify Build as a `major.minor.patch` string
      NETLIFY_BUILD_VERSION,
      // The Netlify Site ID
      SITE_ID,
      NETLIFY_API_TOKEN
    } = constants;
    try {
      const cwd = process.cwd()
      // Commands are printed in Netlify logs
      const netligraphPath = `${process.cwd()}/netlify`;
      const appId = SITE_ID
      const authToken = NETLIFY_API_TOKEN
      const oneGraphApp = upsertAppForSite(authToken, appId)
      const enabledServicesInfo = await fetchEnabledServices(authToken, appId)
      const enabledServices = enabledServicesInfo.map(service => service.service)
      const schema = await fetchOneGraphSchema(appId, enabledServices)

      let appOperationsDoc = readGraphQLOperationsSourceFile(netligraphPath)
      let [parsedDoc] = readAndParseGraphQLOperationsSourceFile(netligraphPath)

      if (appOperationsDoc.trim().length === 0) {
        appOperationsDoc = `query PlaceholderQuery {
    __typename
  }`
        parsedDoc = parse(appOperationsDoc)
      }

      const operations = extractFunctionsFromOperationDoc(parsedDoc)
      generateFunctionsFile(netligraphPath, schema, appOperationsDoc, operations)
    } catch (error) {
      // Report a user error
      build.failBuild('Error generating Netligraph client', { error })
    }

    // Console logs are shown in Netlify logs
    // console.log('Netlify configuration', netlifyConfig)
    // console.log('Plugin configuration', inputs)
    // console.log('Build directory', PUBLISH_DIR)

    // Display success information
    status.show({ summary: 'Success!' })
  },

  // Other available event handlers
  /*
  // Before build commands are executed
  onPreBuild() {},
  // Build commands are executed
  onBuild() {},
  // After Build commands are executed
  onPostBuild() {},
  // Runs on build success
  onSuccess() {},
  // Runs on build error
  onError() {},
  // Runs on build error or success
  onEnd() {},
  */
}
