pipeline {
    agent any

    environment {
        DOCKER_HOST_IP = "13.51.160.23"
        DOCKER_USER = "ubuntu"
        DOCKER_APP_DIR = "app"
        RECIPIENTS = '02fe23bcs411@kletech.ac.in, 02fe23bcs430@kletech.ac.in, 02fe23bcs420@kletech.ac.in, 02fe22bcs050@kletech.ac.in'
    }

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/Yash-Shinde12/BloodBank-Web.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'ec2-ssh-key', keyFileVariable: 'KEY')]) {
                    sh """
                        ssh -i \$KEY -o StrictHostKeyChecking=no ${DOCKER_USER}@${DOCKER_HOST_IP} '
                            rm -rf ${DOCKER_APP_DIR} && mkdir -p ${DOCKER_APP_DIR}
                        '

                        scp -i \$KEY -o StrictHostKeyChecking=no -r . \
                            ${DOCKER_USER}@${DOCKER_HOST_IP}:${DOCKER_APP_DIR}/

                        ssh -i \$KEY -o StrictHostKeyChecking=no ${DOCKER_USER}@${DOCKER_HOST_IP} '
                            cd ${DOCKER_APP_DIR} &&
                            docker build -t app .
                        '
                    """
                }
            }
        }

        stage('Run Container') {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'ec2-ssh-key', keyFileVariable: 'KEY')]) {
                    sh """
                        ssh -i \$KEY -o StrictHostKeyChecking=no ${DOCKER_USER}@${DOCKER_HOST_IP} '
                            docker rm -f app-container || true &&
                            docker run -d -p 3000:3000 --name app-container app
                        '
                    """
                }
            }
        }

        stage('Selenium Tests') {
            steps {
                sh """
                    echo "Running Selenium tests..."
                    # TODO: Add your Selenium test command here
                """
            }
        }
    }

    post {
        success {
            emailext(
                subject: "✅ Build Successful: ${env.JOB_NAME} [#${env.BUILD_NUMBER}]",
                body: """Great news!

Build #${env.BUILD_NUMBER} of job '${env.JOB_NAME}' succeeded.

View it here: ${env.BUILD_URL}""",
                to: "${env.RECIPIENTS}"
            )
        }

        failure {
            emailext(
                subject: "❌ Build Failed: ${env.JOB_NAME} [#${env.BUILD_NUMBER}]",
                body: """Oops!

Build #${env.BUILD_NUMBER} of job '${env.JOB_NAME}' failed.

View it here: ${env.BUILD_URL}""",
                to: "${env.RECIPIENTS}"
            )
        }
    }
}
