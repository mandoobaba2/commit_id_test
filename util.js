import path from 'path';
import fs from 'fs';

import copyClipboard from 'copy-to-clipboard';

/**
 * 객체, 배열, 텍스트, 값 등 비어있는 지 체크하는 유틸성 함수로
 * 해당 파일의 _.isEmpty() 함수가 edge runtime의 동적 코드 할당 제약으로 인해 빌드 실패함에 따라 임의로 추가
 * @todo 동작 상의 문제가 없다면 lodash 정리 후 아래 함수로 대체 예정
 */
export const isEmpty = (value) => {
  // null, undefined, 빈 문자열 확인
  if (value == null || value == undefined || value === '') return true;

  // 배열, Map, Set 확인
  if (Array.isArray(value) || value instanceof Map || value instanceof Set) {
    return value.size === 0 || value.length === 0;
  }

  // 객체 확인
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  // 나머지 타입들 (숫자, boolean 등)은 비어있지 않음
  return false;
};

/**
 * 클립보드에 저장 후 toast를 띄워주는 util function
 * @param {*} content
 */
export const copyToClipboard = (content) => {
  return copyClipboard(content);
};

export const showToastMessage = (toastGroupRef, type, title, error) => {
  toastGroupRef.current?.push?.({
    title,
    type,
  });
};

export const isTokenExpried = (token) => {
  if (token === undefined || token === null) {
    return true;
  }

  const now = Math.floor(new Date() / 1000);
  const accessTokenPayload = JSON.parse(atob(token.split('.')[1]));
  const accessTokenExp = accessTokenPayload.exp;
  return now >= accessTokenExp;
};

export const getRoleFromAccessToken = (accessToken) => {
  if (accessToken === undefined || accessToken === null) {
    return null;
  }
  const accessTokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
  return accessTokenPayload['cognito:groups'][0];
};

export const parsePolicyStringToMap = (policy) => {
  if (isEmpty(policy) || typeof policy !== 'string') {
    return null;
  }
  const retMap = new Map();
  const policyArr = policy.split(/\r?\n/);
  policyArr.map((elem) => {
    if (!elem.includes('=')) return;
    const key = elem.split('=')[0];
    const value = elem.split('=')[1];
    retMap.set(key, value);
  });
  return retMap;
};

export const parsePolicyMapToString = (policy) => {
  if (isEmpty(policy) || !(policy instanceof Map)) return '';
  let retStr = '';
  policy.forEach((value, key) => {
    if (isEmpty(value)) return false;
    retStr += `${key}=${value}\r\n`;
  });
  retStr = retStr.replace(/\r\n$/, '');
  return retStr;
};

export const openEckLogPage = (
  workerId,
  ondemandProfile,
  rangeFrom,
  rangeTo,
) => {
  if (workerId == null || workerId == undefined) {
    console.log('invalid workerId: ' + workerId);
  }

  if (rangeFrom) rangeFrom = rangeFrom.split('+')[0];
  else rangeFrom = 'now-15m';

  if (rangeTo) rangeTo = rangeTo.split('+')[0];
  else rangeTo = 'now';

  const url = `https://${ondemandProfile}mon.app.sparrowcloud.ai/app/logs/stream?logFilter=(filters:!((%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,field:kubernetes.pod.name,index:log-view-default,key:kubernetes.pod.name,negate:!f,params:(query:${workerId}),type:phrase),query:(match_phrase:(kubernetes.pod.name:${workerId})))),query:(language:kuery,query:%27%27),refreshInterval:(pause:!t,value:5000),timeRange:(from:'${rangeFrom}',to:'${rangeTo}'))`;
  window.open(url, '_blank');
};

export const openEckPerformacePage = (
  workerId,
  ondemandProfile,
  rangeFrom,
  rangeTo,
) => {
  if (workerId == null || workerId == undefined) {
    console.log('invalid workerId: ' + workerId);
  }
  if (rangeFrom) rangeFrom = rangeFrom.split('+')[0];
  else rangeFrom = 'now-15m';

  if (rangeTo) rangeTo = rangeTo.split('+')[0];
  else rangeTo = 'now';

  const url = `https://${ondemandProfile}mon.app.sparrowcloud.ai/app/apm/services?comparisonEnabled=true&environment=ENVIRONMENT_ALL&rangeFrom=${rangeFrom}&rangeTo=${rangeTo}&offset=1d&kuery=kubernetes.pod.name%20:%20%22${workerId}%22`;
  window.open(url, '_blank');
};

/**
 * @param {*} urlPath ex) docs/sdk/ko/2502.1/java/v1
 * @returns
 */
export const getMarkdownFileContent = (urlPath) => {
  let content = '';
  let isFile = false;
  let filePath = path.join(
    process.cwd(),
    'public',
    'resources',
    convertLatestToReleaseVersion(urlPath, 3),
  );

  if (isMarkdownDir(urlPath)) {
    // 1. 해당 filePath에 대해 ${PATH}/index.md 파일이 존재하는 경우
    filePath = path.join(filePath, 'index.md');
    isFile = true;
  } else {
    // 2. 해당 filePath에 대해 ${PATH}.md 파일이 존재하는 경우
    filePath = filePath + '.md';
  }

  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('Error reading file: ', error);
  }

  return { content, isFile };
};

/**
 * 마크다운 형식에서 미디어 파일 링크를 접근 가능 url로 변환시키는 함수
 * 1. 마크다운 텍스트 내에서 미디어 파일 링크 목록을 조회 한 뒤
 * 2. public 폴더의 접근 가능한 url로 변환 처리
 */
export const convertMdResourcePathToUrl = (mdString, urlPathname, isFile) => {
  const mdLinkRegex = /(?<=\[.*?\]\()\S+?(?=\))/g;
  const extIncludedRegex = /\.[a-zA-Z]+$/;

  // 해시(#) 제거 및 최신 버전 URL 변환
  const basePath = urlPathname.split('#')[0];

  return mdString.replace(mdLinkRegex, (match) => {
    if (match.startsWith('http') || match.startsWith('#')) {
      return match; // 외부 링크 및 해시 링크는 변경하지 않음
    }

    const pathArr = isFile
      ? [basePath, match]
      : [basePath, `..${path.posix.sep}`, match];

    // 링크에 확장자 포함 여부 검사
    const extIncluded = extIncludedRegex.test(match);
    return extIncluded
      ? path.posix.join('/resources', path.posix.resolve(...pathArr))
      : path.posix.resolve(...pathArr);
  });
};

export const isMarkdownDir = (urlPath) => {
  let fileContent = '';
  urlPath = convertLatestToReleaseVersion(urlPath, 3);

  let filePath = path.join(process.cwd(), 'public', 'resources', urlPath);

  if (fs.existsSync(filePath + '.md')) {
    // 1. 해당 filePath에 대해 ${PATH}.md 파일이 존재하는 경우 파일
    return false;
  } else {
    // 2. 해당 filePath에 대해 ${PATH}/index.md 파일이 존재하는 경우 디렉토리
    return true;
  }
};

export const convertLatestToReleaseVersion = (urlPath, index) => {
  const urlPathSegments = urlPath.split(path.sep);

  // 'latest'가 아니라면 원본 경로를 그대로 반환
  if (urlPathSegments[index] !== 'latest') {
    return urlPath;
  }

  // urlPath의 시작에 슬래시가 있다면 제거하여 정규화
  const normalizedUrlPath = urlPath.startsWith(path.sep)
    ? urlPath.substring(1)
    : urlPath;
  const pathSegments = normalizedUrlPath.split(path.sep);

  // 원래 경로가 슬래시로 시작하는 경우와 그렇지 않은 경우에 따라 슬라이스할 인덱스를 결정
  const sliceEndIndex = urlPath.startsWith(path.sep) ? index - 1 : index;
  const releaseVersionDirPath = path.join(
    'public',
    'resources',
    pathSegments.slice(0, sliceEndIndex).join(path.sep),
  );

  // 대상 디렉토리의 절대 경로를 계산한 후 하위 디렉토리 목록 반환
  const directoryAbsolutePath = path.join(process.cwd(), releaseVersionDirPath);
  const items = fs.readdirSync(directoryAbsolutePath, { withFileTypes: true });

  const directories = items
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .sort();

  // 디렉토리가 존재한다면 'latest'를 최신 릴리즈 버전 디렉토리 이름으로 교체
  if (directories.length > 0) {
    urlPathSegments[index] = directories[directories.length - 1];
  }

  return urlPathSegments.join(path.sep);
};
