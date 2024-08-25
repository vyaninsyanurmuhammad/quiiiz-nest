pipeline {
    agent any
    tools { nodejs 'node' }
    stages {
        stage('Define Env') {
            steps {
                withCredentials([file(credentialsId: 'quiiiz_be_env', variable: 'ENV_FILE')]) {
                    sh 'cp $ENV_FILE $WORKSPACE/.env'
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
        stage('Clean Old Image') { // Tahap baru untuk membersihkan image lama
            steps {
                script {
                    // Hapus container terlebih dahulu jika berjalan, lalu hapus image
                    sh '''
                        docker stop quiiiz_be || true
                        docker rm quiiiz_be || true
                        docker rmi vyaninsyanurmuhammad/quiiiz_be:latest || true
                    '''
                }
            }
        }
        stage('Building Image') {
            steps {
                sh 'docker build . -t vyaninsyanurmuhammad/quiiiz_be:latest'
            }
        }
        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerHubVyan', passwordVariable: 'dockerHubVyanPassword', usernameVariable: 'dockerHubVyanUser')]) {
                    sh "docker login -u ${env.dockerHubVyanUser} -p ${env.dockerHubVyanPassword}"
                    sh 'docker push vyaninsyanurmuhammad/quiiiz_be:latest'
                }
            }
        }
        stage('Migrate Prisma Database') {
            steps {
                sh 'docker run --rm --env-file .env vyaninsyanurmuhammad/quiiiz_be:latest npx prisma migrate deploy'
            }
        }
        stage('Deploy Image') {
            steps {
                sh 'docker stop quiiiz_be || true'
                sh 'docker rm quiiiz_be || true'
                sh 'docker run -d --name quiiiz_be --env-file .env -p 8002:8002 vyaninsyanurmuhammad/quiiiz_be:latest'
            }
        }
    }
}
