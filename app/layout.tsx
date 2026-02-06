'use client';

import './globals.css';
import { ReactNode, useEffect, useState } from 'react';
import {
  ThemeProvider as AmplifyThemeProvider,
  Theme,
  ColorMode,
  SelectField,
  Authenticator,
} from '@aws-amplify/ui-react';
import DesignerContextProvider from '../components/context/DesignerContextProvider';
import { ThemeProvider as NextThemeProvider } from '../components/providers/ThemeProvider';
import { Toaster } from '../components/ui/toaster';
import { Inter } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import '@aws-amplify/ui-react/styles.css';
import RouteLoader from '../components/RouteLoader';
import { ProjectProvider} from '../components/context/projectContext';
import { useProjectContext } from '../components/hooks/projectContext.hook';
import { GetClients } from '../actions/form';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../amplify/data/resource';

const dataClient = generateClient<Schema>();
Amplify.configure(outputs);

const inter = Inter({ subsets: ['latin'] });
const colorMode: ColorMode = 'dark';

const theme: Theme = {
  name: 'custom-auth-theme',
  overrides: [
    {
      colorMode: 'dark',
      tokens: {
        colors: {
          background: {
            primary: { value: '#ffffff' },
            secondary: { value: '#1e293b' },
          },
          font: {
            primary: { value: '#030303' },
          },
        },
        components: {
          button: {
            primary: {
              backgroundColor: { value: '#facc15' },
              color: { value: '#000000' },
            },
          },
          field: {
            label: {
              color: { value: '#030303' },
            },
          },
        },
      },
    },
  ],
};

function CustomHeader() {
  return (
    <div className="flex justify-center mb-4">
      <span style={{ color: '#facc15', fontWeight: 'bold', fontSize: '5em' }}>hero</span>
      <span
        className="text-gray-500 font-semibold mr-1"
        style={{ position: 'relative', display: 'inline-block', fontSize: '5em' }}
      >
        <span>au</span>
        <sub
          style={{
            position: 'absolute',
            left: 110,
            bottom: '0.4em',
            fontSize: '0.6em',
            color: '#6b7280',
          }}
        >
          app
        </sub>
        <span>dit</span>
      </span>
    </div>
  );
}

function SyncProjects() {
  const { projects } = useProjectContext();

  useEffect(() => {
    async function syncData() {
      
      /*if (!projects || projects.length === 0) {
        alert('Syncing projects failed: No projects found, using fallback data');
        return;
      } */
      try {
        const clientMap = new Map<number, { name: string; code: string }>();
        const projectMap = new Map<number, { projectName: string; projectCode: string; clientID: number }>();

        projects.forEach((p) => {
          projectMap.set(p.projectid, {
            projectName: p.projectname,
            projectCode: p.projectcode,
            clientID: p.clientid,
          });

          if (!clientMap.has(p.clientid)) {
            clientMap.set(p.clientid, {
              name: p.clientname,
              code: p.projectcode.slice(0, 5),
            });
          }
        });

        const existingClients = (await dataClient.models.Client.list()).data ?? [];
        const existingProjects = (await dataClient.models.Project.list()).data ?? [];

        const existingClientIDs = new Set(existingClients.map((c) => c.id));
        const existingProjectIDs = new Set(existingProjects.map((p) => p.id));

        for (const [id, { name, code }] of Array.from(clientMap.entries())) {
          if (!existingClientIDs.has(id.toString())) {
            await dataClient.models.Client.create({
              id: id.toString(),
              ClientName: name,
              ClientCode: code,
            });

          }
        }

        for (const [id, { projectName, projectCode, clientID }] of Array.from(projectMap.entries())) {
          if (!existingProjectIDs.has(id.toString())) {
            await dataClient.models.Project.create({
              id: id.toString(),
              projectName,
              projectCode,
              clientID: clientID.toString(),
            });
  
          } else {
            await dataClient.models.Project.update({
              id: id.toString(),
              projectName,
              projectCode,
              clientID: clientID.toString(),
            });
            //console.log(`ℹ️ Project updated: ${projectName}`);
          }
        }
      } catch (error) {
        console.error('❌ Error syncing data:', error);
      }
    }

    syncData();
    console.log('Data synced successfully');
  }, [projects]);

  return null;
}

function CustomFormFields() {
  const { projects } = useProjectContext();
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadClients() {
      setLoading(true);
      try {
        if (projects && projects.length > 0) {
          const projectClients = new Map<string, string>();
          projects.forEach((p) => {
            if (p.clientid && p.clientname && p.projectcode) {
              projectClients.set(p.clientid.toString(), p.clientname);
            }
          });

          const sorted = Array.from(projectClients.entries())
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([id, name]) => ({ id, name }));

          setClientOptions(sorted);

          const { data: existingClients = [] } = await dataClient.models.Client.list({});
          const existingClientIDs = new Set(existingClients.map((c) => c.id));

          for (const { id, name } of sorted) {
            if (!existingClientIDs.has(id)) {
              try {
                await dataClient.models.Client.create({
                  id,
                  ClientName: name,
                  ClientCode: name.toLowerCase().replace(/\s+/g, '_'),
                });
        
              } catch (err) {
                console.warn(`❌ Error adding client "${name}":`, err);
              }
            }
          }
        } else {
          const fallback = await GetClients();
          const mapped = fallback.map((c) => ({ id: c.id, name: c.name }));
          setClientOptions(mapped);
        }
      } catch (err) {
        console.error('Error in loadClients:', err);
      } finally {
        setLoading(false);
      }
    }

    loadClients();
  }, [projects]);

  return (
    <>
      <Authenticator.SignUp.FormFields />
      <SelectField
        label="Company"
        name="custom:Company"
        placeholder={loading ? 'Loading companies...' : 'Select a company'}
        isRequired
        disabled={loading}
      >
        {clientOptions.map((client) => (
          <option key={client.id} value={client.name}>
            {client.name}
          </option>
        ))}
      </SelectField>
    </>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>HeroAuditApp</title>
        <meta name="theme-color" content="#facc15" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        <ProjectProvider>
          <NextTopLoader />
          <RouteLoader />
          <AmplifyThemeProvider theme={theme} colorMode={colorMode}>
            <DesignerContextProvider>
              <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <div className="h-screen flex items-center justify-center">
                  <Authenticator
                    components={{
                      Header: CustomHeader,
                      SignUp: {
                        FormFields: CustomFormFields,
                      },
                    }}
                  >
                    {/* ✅ Corrected Component Usage */}
                    <SyncProjects />
                    {children}
                    <Toaster />
                  </Authenticator>
                </div>
              </NextThemeProvider>
            </DesignerContextProvider>
          </AmplifyThemeProvider>
        </ProjectProvider>
      </body>
    </html>
  );
}
