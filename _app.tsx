import React, { useEffect, createContext, useMemo, useRef } from 'react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { DevTools } from 'jotai-devtools';

import {
  QueryClientProvider,
  QueryClient,
  HydrationBoundary,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { I18nextProvider, useTranslation } from 'react-i18next';
// import i18n from '@/utils/i18n';
import { i18nInstance } from '@repo/utils';

import { isEmpty } from 'lodash';
import moment from 'moment';

import { showToastMessage as _showToastMessage } from '@/utils/util';
import { ToastGroup } from '@sparrow/components';

import { ThemeProvider } from '@emotion/react';
import { light } from '@sparrow/components/dist/styles';
import ComponentStyle from '@sparrow/components/dist/styles/ComponentStyle';
import '@sparrow/components/dist/sparrow.css';
import '@sparrow/components/dist/public/fonts/sparrow-icon/sparrow.css';

import '@/styles/_app.css';
import ModalProvider from '@/components/provider/ModalProvider';

// for chartjs
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
Chart.register(
  CategoryScale,
  ChartDataLabels,
  BarController,
  BarElement,
  LineController,
  LineElement,
  LinearScale,
  ArcElement,
  PointElement,
  Tooltip,
);

export const UserContext = createContext({});

import { useGetOndemandEnv } from '@/hook/api/useGetOndemandEnv';
import { useAtom } from 'jotai';
import { ondemandEnvAtom } from '@/lib/jotai/common';
import { cognito, setUserPool } from '@/utils/cognito';

import { ErrorBoundary } from 'react-error-boundary';
import PageError from '@/components/common/PageError';

const profile = process.env.ONDEMAND_PROFILE;
const nodeEnv = process.env.NODE_ENV;

// Infra - elastic-apm 추가 요청
if (
  typeof window === 'undefined' 
  && nodeEnv === "production") {
  // eslint-disable-next-line global-require
  const apm = require('elastic-apm-node');
  if (!apm.isStarted()) {
    // Check if the APM agent is already started

    if (profile === 'dev') {
      apm.start({
        serviceName: 'ondemand-frontend-console',
        secretToken: 'MOtk80i4o7Y1Js6A5237QGiO',
        serverUrl: 'https://dev-apm-http.kube-system.svc.cluster.local:8200',
        environment: 'dev',
        verifyServerCert: false,
      });
    }
    if (profile === 'stag') {
      apm.start({
        serviceName: 'ondemand-frontend-console',
        secretToken: 'p1R1zU900Vhup0817BB1LcsP',
        serverUrl: 'http://stag-apm-http.default.svc.cluster.local:8200',
        environment: 'stag',
        verifyServerCert: false,
      });
    }
    if (profile === 'prod') {
      apm.start({
        serviceName: 'ondemand-frontend-console',
        secretToken: 'XMcijRcZW4567c1C10H9Bb94',
        serverUrl: 'http://prod-apm-http.default.svc.cluster.local:8200',
        environment: 'prod',
        verifyServerCert: false,
      });
    }
  }
}

function App({ Component, pageProps }: AppProps) {
  const toastGroupRef = useRef(null);
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // gcTime: Infinity,
            // staleTime: 600000, // 10min
            refetchOnMount: true,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const { i18n: i18nSetting } = useTranslation('common');

  const contextValue = useMemo(
    () => ({
      toastGroupRef,
      showToastMessage: (type: any, title: any, error: any) =>
        _showToastMessage(toastGroupRef, type, title, error),
    }),
    [],
  );

  // 온디맨드 환경 변수 불러오기
  useGetOndemandEnv();
  const [ondemandEnv] = useAtom(ondemandEnvAtom);
  const { COGNITO_USERPOOL_ID: userPoolId, COGNITO_APPCLIENT_ID: clientId } =
    ondemandEnv;
  /**
   * 24.12.19 kjh
   * useSessionCheck 제거로 인해 메모리 상에서 존재하는 cognito 객체 정보를
   * 새로고침 후에도 유지할 필요가 있기 때문에 추가
   */
  useEffect(() => {
    if (isEmpty(cognito.userPool)) setUserPool(userPoolId, clientId);
  }, [userPoolId, clientId]);

  /**
   * TODO : 중요!! 배포 전에 언어 설정 봐야합니다ㅏㅏㅏㅏ
   */
  useEffect(() => {
    let locale = navigator.language;
    if (isEmpty(locale)) {
      locale = 'en';
    }
    // locale = 'zu';
    i18nSetting.changeLanguage(locale);
    moment.locale(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter();

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={pageProps.dehydratedState}>
          <I18nextProvider i18n={i18nInstance}>
            <ThemeProvider theme={light}>
              <ComponentStyle />
              <UserContext.Provider value={contextValue}>
                <Head>
                  <meta charSet="utf-8" />
                  <link rel="icon" href="/favicon.ico" />
                  <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                  />
                  <meta name="theme-color" content="#000000" />
                  <meta
                    name="description"
                    content="Powerful API-based application security testing solution"
                  />
                  <title>Sparrow On-Demand</title>
                </Head>
                <ErrorBoundary
                  key={router.asPath}
                  fallbackRender={({ resetErrorBoundary }) => (
                    <PageError resetErrorBoundary={resetErrorBoundary} />
                  )}
                  onReset={() => {
                    router.back();
                  }}
                >
                  <Component {...pageProps} />
                </ErrorBoundary>
                <ModalProvider />
              </UserContext.Provider>
              <ToastGroup ref={toastGroupRef} />
            </ThemeProvider>
          </I18nextProvider>
        </HydrationBoundary>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
      <DevTools />
    </>
  );
}

export default App;
