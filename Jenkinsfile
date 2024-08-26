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

        stage('Verify .env') {
            steps {
                sh '''
                echo "Verifying .env file..."
                cat .env
                echo "DATABASE_URL=$(grep DATABASE_URL .env)"
                echo "DIRECT_URL=$(grep DIRECT_URL .env)"
                '''
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

        stage('Clean Up Old Docker Container and Image') {
            steps {
                sh '''
                echo "Stopping and removing old container 'quiiiz_be'..."
                docker stop quiiiz_be || true
                docker rm quiiiz_be || true
                
                echo "Cleaning up old image 'quiiiz_be'..."
                docker rmi ${IMAGE_NAME}:${IMAGE_TAG} || true
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build . -t ${IMAGE_NAME}:${IMAGE_TAG}'
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

        stage('Verify .env in Docker') {
            steps {
                sh '''
                echo "Verifying .env file in Docker container..."
                docker run --rm --env-file .env ${IMAGE_NAME}:${IMAGE_TAG} cat .env
                '''
            }
        }

        stage('Deploy Docker Container') {
            steps {
                sh '''
                echo "Deploying Docker container..."
                docker run -d --name quiiiz_be --env-file .env -p 8002:8002 ${IMAGE_NAME}:${IMAGE_TAG}
                '''
            }
        }
    }
}
