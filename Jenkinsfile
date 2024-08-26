pipeline {
    agent any
    tools { nodejs 'node' }
    
    environment {
        IMAGE_NAME = 'vyaninsyanurmuhammad/quiiiz_be'
        IMAGE_TAG = 'latest'
    }

    stages {
        stage('Set Environment') {
            steps {
                withCredentials([file(credentialsId: 'quiiiz_be_env', variable: 'ENV_FILE')]) {
                    sh 'cp $ENV_FILE .env'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Check Docker') {
            steps {
                sh 'docker --version'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Cleaning up old Docker images..."
                    sh 'docker image prune -f'
                    echo "Building Docker image..."
                    sh 'docker build --no-cache -t ${IMAGE_NAME}:${IMAGE_TAG} .'
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerHubVyan', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                    echo "Logging in to Docker Hub..."
                    echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                    echo "Pushing Docker image..."
                    docker push ${IMAGE_NAME}:${IMAGE_TAG}
                    '''
                }
            }
        }

        stage('Clean Up Docker Containers Before Deploy') {
            steps {
                script {
                    echo "Stopping and removing existing container..."
                    sh 'docker stop quiiiz_be || true && docker rm quiiiz_be || true'
                }
            }
        }

        stage('Deploy Docker Container') {
            steps {
                echo "Deploying Docker container..."
                sh '''
                docker run -d --name quiiiz_be --env-file .env -p 8002:8002 ${IMAGE_NAME}:${IMAGE_TAG}
                '''
            }
        }
    }
}
