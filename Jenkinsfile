pipeline {
  agent any

  environment {
    IMAGE_NAME = 'fz-messaging-service'
    CONTAINER_NAME = 'fz-messaging-service'
    APP_PORT = '9093'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm install'
      }
    }

    stage('Run Tests') {
      steps {
        echo 'Skipping tests...'
        // You can add: sh 'npm test'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh "docker build -t $IMAGE_NAME ."
      }
    }

    stage('Stop Existing Container') {
      steps {
        script {
          // Stop and remove if container already running
          sh """
            if [ \$(docker ps -q -f name=$CONTAINER_NAME) ]; then
              docker stop $CONTAINER_NAME
              docker rm $CONTAINER_NAME
            fi
          """
        }
      }
    }

    stage('Run Docker Container') {
      steps {
        sh "docker run -d --name $CONTAINER_NAME -p $APP_PORT:$APP_PORT $IMAGE_NAME"
      }
    }
  }

  post {
    success {
      echo "✅ App is running locally on port $APP_PORT"
    }
    failure {
      echo "❌ Build or run failed!"
    }
  }
}
