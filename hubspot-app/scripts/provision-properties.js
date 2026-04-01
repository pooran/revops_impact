#!/usr/bin/env node

/**
 * Provision MEDDICC Custom Properties in HubSpot
  *
   * Creates the property group and all 15 deal properties
    * (7 score picklists, 7 notes text areas, 1 composite score number)
     * required by the MEDDICC scoring workflow.
      *
       * Usage:
        *   HUBSPOT_ACCESS_TOKEN=pat-xxx node scripts/provision-properties.js
         *
          * Requires: @hubspot/api-client
           */

           const hubspot = require('@hubspot/api-client');
           const propertyConfig = require('../config/custom-properties.json');

           const ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

           if (!ACCESS_TOKEN) {
             console.error('Error: HUBSPOT_ACCESS_TOKEN environment variable is required.');
               process.exit(1);
               }

               const hubspotClient = new hubspot.Client({ accessToken: ACCESS_TOKEN });

               async function createPropertyGroup() {
                 try {
                     await hubspotClient.crm.properties.groupsApi.create('deals', {
                           name: propertyConfig.propertyGroupName,
                                 label: propertyConfig.propertyGroupLabel,
                                       displayOrder: -1,
                                           });
                                               console.log(`Created property group: ${propertyConfig.propertyGroupName}`);
                                                 } catch (err) {
                                                     if (err.code === 409 || (err.body && err.body.category === 'CONFLICT')) {
                                                           console.log(`Property group "${propertyConfig.propertyGroupName}" already exists, skipping.`);
                                                               } else {
                                                                     throw err;
                                                                         }
                                                                           }
                                                                           }

                                                                           async function createProperty(propertyDef) {
                                                                             try {
                                                                                 await hubspotClient.crm.properties.coreApi.create('deals', propertyDef);
                                                                                     console.log(`  Created property: ${propertyDef.name}`);
                                                                                       } catch (err) {
                                                                                           if (err.code === 409 || (err.body && err.body.category === 'CONFLICT')) {
                                                                                                 console.log(`  Property "${propertyDef.name}" already exists, skipping.`);
                                                                                                     } else {
                                                                                                           throw err;
                                                                                                               }
                                                                                                                 }
                                                                                                                 }
                                                                                                                 
                                                                                                                 async function main() {
                                                                                                                   console.log('Provisioning MEDDICC properties in HubSpot...\n');
                                                                                                                   
                                                                                                                     await createPropertyGroup();
                                                                                                                     
                                                                                                                       console.log('\nCreating properties:');
                                                                                                                         for (const prop of propertyConfig.properties) {
                                                                                                                             await createProperty(prop);
                                                                                                                               }
                                                                                                                               
                                                                                                                                 console.log('\nDone. All MEDDICC properties are provisioned.');
                                                                                                                                 }
                                                                                                                                 
                                                                                                                                 main().catch((err) => {
                                                                                                                                   console.error('Provisioning failed:', err.message);
                                                                                                                                     process.exit(1);
                                                                                                                                     });
