pipeline {
    agent any
    tools { nodejs 'node' }
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

        stage('Clean Up Docker Images') {
            steps {
                sh '''
                echo "Cleaning up old Docker images..."
                docker images -q --filter "dangling=true" | xargs -r docker rmi
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build . -t vyaninsyanurmuhammad/quiiiz_be:latest'
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerHubVyan', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                    echo "Logging in to Docker Hub..."
                    echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                    echo "Pushing Docker image..."
                    docker push vyaninsyanurmuhammad/quiiiz_be:latest
                    '''
                }
            }
        }

        stage('Verify .env in Docker') {
            steps {
                sh '''
                echo "Verifying .env file in Docker container..."
                docker run --rm --env-file .env vyaninsyanurmuhammad/quiiiz_be:latest cat .env
                '''
            }
        }

        stage('Clean Up Docker Containers and Images Before Deploy') {
            steps {
                sh '''
                echo "Stopping existing container if exists..."
                docker stop quiiiz_be || true
                echo "Removing existing container if exists..."
                docker rm quiiiz_be || true
                echo "Cleaning up old Docker images..."
                docker image prune -af
                '''
            }
        }

        stage('Migrate Prisma Database') {
            steps {
                sh '''
                echo "Running Prisma migration..."
                docker run --rm --env-file .env vyaninsyanurmuhammad/quiiiz_be:latest npx prisma migrate dev --name init
                '''
            }
        }

        stage('Deploy Docker Container') {
            steps {
                sh '''
                echo "Deploying Docker container..."
                docker run -d --name quiiiz_be --env-file .env -p 8002:8002 vyaninsyanurmuhammad/quiiiz_be:latest
                '''
            }
        }
    }
}
