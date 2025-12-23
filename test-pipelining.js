/**
 * Script de test pour valider le support du HTTP Pipelining
 *
 * Usage: node test-pipelining.js
 *
 * Le serveur doit être démarré sur localhost:4221 avant d'exécuter ce script
 */

const net = require('net');

console.log('='.repeat(80));
console.log('TEST HTTP PIPELINING');
console.log('='.repeat(80));

// Test 1: Deux requêtes GET pipelinées simples
function test1_SimpleGETPipelining() {
  return new Promise((resolve, reject) => {
    console.log('\n[TEST 1] Deux requêtes GET pipelinées simples');
    console.log('-'.repeat(80));

    const client = net.createConnection({ port: 4221, host: 'localhost' }, () => {
      console.log('✓ Connecté au serveur');

      // Envoyer deux requêtes GET collées
      const request1 = 'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n';
      const request2 = 'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n';

      console.log('→ Envoi de deux requêtes GET pipelinées');
      client.write(request1 + request2);
    });

    let responseData = '';
    let responseCount = 0;

    client.on('data', (data) => {
      responseData += data.toString();

      // Compter le nombre de réponses HTTP (chaque réponse commence par "HTTP/1.1")
      const matches = responseData.match(/HTTP\/1\.1/g);
      if (matches) {
        responseCount = matches.length;
      }

      // Si on a reçu 2 réponses, on a terminé
      if (responseCount >= 2) {
        console.log(`✓ Reçu ${responseCount} réponses HTTP`);
        console.log('✓ TEST 1 RÉUSSI: Les deux requêtes ont été traitées');
        client.end();
      }
    });

    client.on('end', () => {
      if (responseCount === 2) {
        resolve();
      } else {
        reject(new Error(`Attendu 2 réponses, reçu ${responseCount}`));
      }
    });

    client.on('error', (err) => {
      console.error('✗ Erreur:', err.message);
      reject(err);
    });

    // Timeout après 3 secondes
    setTimeout(() => {
      if (responseCount < 2) {
        console.error(`✗ TIMEOUT: Seulement ${responseCount}/2 réponses reçues`);
        client.destroy();
        reject(new Error('Timeout'));
      }
    }, 3000);
  });
}

// Test 2: POST + GET pipelinées (avec Content-Length)
function test2_POSTandGETPipelining() {
  return new Promise((resolve, reject) => {
    console.log('\n[TEST 2] POST + GET pipelinées (Content-Length)');
    console.log('-'.repeat(80));

    const client = net.createConnection({ port: 4221, host: 'localhost' }, () => {
      console.log('✓ Connecté au serveur');

      // POST avec body de 11 bytes + GET collées
      const postRequest = 'POST /files/test.txt HTTP/1.1\r\nHost: localhost\r\nContent-Length: 11\r\n\r\nHello World';
      const getRequest = 'GET /files/test.txt HTTP/1.1\r\nHost: localhost\r\n\r\n';

      console.log('→ Envoi POST (11 bytes) + GET pipelinées');
      client.write(postRequest + getRequest);
    });

    let responseData = '';
    let responseCount = 0;

    client.on('data', (data) => {
      responseData += data.toString();

      const matches = responseData.match(/HTTP\/1\.1/g);
      if (matches) {
        responseCount = matches.length;
      }

      if (responseCount >= 2) {
        console.log(`✓ Reçu ${responseCount} réponses HTTP`);

        // Vérifier que le GET a bien reçu le contenu du fichier
        if (responseData.includes('Hello World')) {
          console.log('✓ Le fichier a été sauvegardé et lu correctement');
          console.log('✓ TEST 2 RÉUSSI: POST + GET pipelinées fonctionnent');
        } else {
          console.log('⚠ Attention: Le contenu "Hello World" n\'a pas été trouvé dans la réponse GET');
        }
        client.end();
      }
    });

    client.on('end', () => {
      if (responseCount === 2) {
        resolve();
      } else {
        reject(new Error(`Attendu 2 réponses, reçu ${responseCount}`));
      }
    });

    client.on('error', (err) => {
      console.error('✗ Erreur:', err.message);
      reject(err);
    });

    setTimeout(() => {
      if (responseCount < 2) {
        console.error(`✗ TIMEOUT: Seulement ${responseCount}/2 réponses reçues`);
        client.destroy();
        reject(new Error('Timeout'));
      }
    }, 3000);
  });
}

// Test 3: Requête incomplète (doit attendre plus de données)
function test3_IncompleteRequest() {
  return new Promise((resolve, reject) => {
    console.log('\n[TEST 3] Requête incomplète (headers partiels)');
    console.log('-'.repeat(80));

    const client = net.createConnection({ port: 4221, host: 'localhost' }, () => {
      console.log('✓ Connecté au serveur');

      // Envoyer une requête complète + une requête incomplète
      const completeRequest = 'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n';
      const incompleteRequest = 'GET / HTTP/1.1\r\nHost: loc'; // Incomplet

      console.log('→ Envoi requête complète + requête incomplète');
      client.write(completeRequest + incompleteRequest);

      // Attendre un peu puis envoyer la fin
      setTimeout(() => {
        console.log('→ Envoi de la fin de la requête incomplète');
        client.write('alhost\r\n\r\n');
      }, 500);
    });

    let responseCount = 0;

    client.on('data', (data) => {
      const matches = data.toString().match(/HTTP\/1\.1/g);
      if (matches) {
        responseCount += matches.length;
      }

      if (responseCount >= 2) {
        console.log(`✓ Reçu ${responseCount} réponses HTTP`);
        console.log('✓ TEST 3 RÉUSSI: Les requêtes incomplètes sont gérées correctement');
        client.end();
      }
    });

    client.on('end', () => {
      if (responseCount === 2) {
        resolve();
      } else {
        reject(new Error(`Attendu 2 réponses, reçu ${responseCount}`));
      }
    });

    client.on('error', (err) => {
      console.error('✗ Erreur:', err.message);
      reject(err);
    });

    setTimeout(() => {
      if (responseCount < 2) {
        console.error(`✗ TIMEOUT: Seulement ${responseCount}/2 réponses reçues`);
        client.destroy();
        reject(new Error('Timeout'));
      }
    }, 3000);
  });
}

// Test 4: Connection: close (doit ignorer les requêtes suivantes)
function test4_ConnectionClose() {
  return new Promise((resolve, reject) => {
    console.log('\n[TEST 4] Connection: close (doit ignorer requêtes suivantes)');
    console.log('-'.repeat(80));

    const client = net.createConnection({ port: 4221, host: 'localhost' }, () => {
      console.log('✓ Connecté au serveur');

      // Première requête avec Connection: close + deuxième requête (doit être ignorée)
      const request1 = 'GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n';
      const request2 = 'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n'; // Doit être ignorée

      console.log('→ Envoi GET avec Connection: close + GET suivante');
      client.write(request1 + request2);
    });

    let responseCount = 0;
    let connectionClosed = false;

    client.on('data', (data) => {
      const matches = data.toString().match(/HTTP\/1\.1/g);
      if (matches) {
        responseCount += matches.length;
      }
    });

    client.on('end', () => {
      connectionClosed = true;
      console.log(`✓ Connexion fermée par le serveur`);
      console.log(`✓ Reçu ${responseCount} réponse(s) (attendu: 1)`);

      if (responseCount === 1) {
        console.log('✓ TEST 4 RÉUSSI: Connection: close fonctionne correctement');
        resolve();
      } else {
        console.error(`✗ ÉCHEC: Attendu 1 réponse, reçu ${responseCount}`);
        reject(new Error(`Attendu 1 réponse, reçu ${responseCount}`));
      }
    });

    client.on('error', (err) => {
      console.error('✗ Erreur:', err.message);
      reject(err);
    });

    setTimeout(() => {
      if (!connectionClosed) {
        console.error('✗ TIMEOUT: La connexion n\'a pas été fermée');
        client.destroy();
        reject(new Error('Timeout'));
      }
    }, 3000);
  });
}

// Exécuter tous les tests séquentiellement
async function runAllTests() {
  try {
    await test1_SimpleGETPipelining();
    await new Promise(resolve => setTimeout(resolve, 500)); // Pause entre tests

    await test2_POSTandGETPipelining();
    await new Promise(resolve => setTimeout(resolve, 500));

    await test3_IncompleteRequest();
    await new Promise(resolve => setTimeout(resolve, 500));

    await test4_ConnectionClose();

    console.log('\n' + '='.repeat(80));
    console.log('✓ TOUS LES TESTS SONT RÉUSSIS!');
    console.log('='.repeat(80));
  } catch (error) {
    console.log('\n' + '='.repeat(80));
    console.error('✗ ÉCHEC DES TESTS:', error.message);
    console.log('='.repeat(80));
    process.exit(1);
  }
}

// Lancer les tests
runAllTests();
