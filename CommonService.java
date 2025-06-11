package com.sparrow.ondemand.worker.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sparrow.ondemand.model.enums.ToolType;
import com.sparrow.ondemand.model.extend.enums.WorkerServiceType;
import com.sparrow.ondemand.worker.service.analysis.ToolRequestSenderFactory;
import com.sparrow.ondemand.worker.util.VersionUtil;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

/**
 * @author lmw
 * 스패로우 온디맨드 워커 모듈의 공통 서비스
 */
@Service
@Getter
@Setter
@RequiredArgsConstructor
public class CommonService {
    private static final Logger logger = LoggerFactory.getLogger(CommonService.class);

    private final Environment env;
    private final ToolRequestSenderFactory toolRequestSenderFactory;

    private String version;
    private String sastVersion = "";
    private String scaVersion = "";
    private String dastVersion = "";
    private Integer resultVersion;

    @PostConstruct
    public void CommonService() throws IOException {
        /**
         * 워커 서비스 버전 파악
         */
        String version = VersionUtil.getVersion();
        String envBuildDate = System.getProperty("ondemand.build-date");
        if(envBuildDate != null) {
            version = version +"-"+ envBuildDate;
        }
        this.setVersion(version);

        /**
         * 24.12.13 lmw - 워커의 결과 버전(resultVersion) 값 추가
         * TODO - 다음 버전에서 워커의 resultVersion 값 어떻게 관리할 지에 대해 논의 필요
         */
        this.setResultVersion(2);
    }

    public void setToolVersion(String toolType, String serviceType) {

        if (ToolType.SAST.getType().equals(toolType) || WorkerServiceType.API.getType().equals(serviceType)){
            try {
                this.setSastVersion(toolRequestSenderFactory.get(ToolType.SAST.getType()).sendVersionRequest());
            } catch (RuntimeException | IOException e){
                logger.error("sast version set fail");
            } catch (Exception e) {
                logger.error("sast version set fail");
            }
        }


        if (ToolType.SCA.getType().equals(toolType) || WorkerServiceType.API.getType().equals(serviceType)){
            try {
                this.setScaVersion(toolRequestSenderFactory.get(ToolType.SCA.getType()).sendVersionRequest());
            } catch (RuntimeException | IOException e){
                logger.error("sca version set fail");
            } catch (Exception e) {
                logger.error("sca version set fail");
            }
        }

        if (ToolType.DAST.getType().equals(toolType) || WorkerServiceType.API.getType().equals(serviceType)){
            try {
                this.setDastVersion(toolRequestSenderFactory.get(ToolType.DAST.getType()).sendVersionRequest());
            } catch (RuntimeException | IOException e){
                logger.error("dast version set fail");
            } catch (Exception e) {
                logger.error("dast version set fail");
            }
        }
    }

    // 워커 버전, 도구 버전들 String
    public String getVersions() {
        final String versionFormat = "W: %s, S: %s, C: %s, D: %s";
        return String.format(versionFormat, this.getVersion(), this.getSastVersion(), this.getScaVersion(), this.getDastVersion());
    }

    public String getDependencyVersions() {
        String dependencyVersionStr = "";
        try (InputStream input = CommonService.class.getClassLoader()
            .getResourceAsStream("dependencies.json")) {
            if (input == null) {
                logger.info("Sparrow 의존성 패키지 버전 확인을 위한 json 파일을 찾을 수 없음");
                return dependencyVersionStr;
            }

            ObjectMapper objectMapper = new ObjectMapper();
            List<Map<String, String>> dependencies = objectMapper.readValue(input, List.class);

            for (Map<String, String> dependency : dependencies) {
                if (dependency.get("group").startsWith("com.sparrow.sca") || dependency.get("group").startsWith("com.sparrow.core")) {
                    if (dependencyVersionStr.length() > 0) {
                        dependencyVersionStr += ", ";
                    }
                    dependencyVersionStr += dependency.get("group") + ":" + dependency.get("name") + ":" + dependency.get("version");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            return dependencyVersionStr;
        }
    }

}
