pipeline {
  agent any

  parameters {
    choice(name: 'DEPLOY_ENV', choices: ['dev', 'prod'], description: 'Environment to build and deploy')
  }

  environment {
    IMAGE_NAME = 'fz-messaging-service'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Run Tests') {
      steps {
        script {
          if (fileExists('package.json') && sh(returnStatus: true, script: 'npm test -- --help >/dev/null 2>&1') == 0) {
            sh 'npm test'
          } else {
            echo 'Skipping tests because no test script is configured.'
          }
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        script {
          def buildTag = "${IMAGE_NAME}:${params.DEPLOY_ENV}"
          sh "docker build --build-arg NODE_ENV=${params.DEPLOY_ENV} -t ${buildTag} ."
        }
      }
    }

    stage('Deploy Container') {
      steps {
        script {
          def envFile = ".env.${params.DEPLOY_ENV}"
          def hostPort = params.DEPLOY_ENV == 'prod' ? '9095' : '9093'
          def containerName = "${IMAGE_NAME}-${params.DEPLOY_ENV}"
          def imageTag = "${IMAGE_NAME}:${params.DEPLOY_ENV}"

          sh "if [ $(docker ps -q -f name=${containerName}) ]; then docker stop ${containerName} && docker rm ${containerName}; fi"
          sh "docker run -d --name ${containerName} --env-file ${envFile} -p ${hostPort}:${hostPort} ${imageTag}"
          echo "Deployed ${containerName} on port ${hostPort} using ${envFile}"
        }
      }
    }
  }

  post {
    success {
      echo 'App deployed successfully.'
    }
    failure {
      echo 'Build or deployment failed!'
    }
  }
}
