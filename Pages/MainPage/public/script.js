function fetchItems() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/getItems", true);

    xhr.onload = function () {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            const items = document.getElementById("items");

            if (Array.isArray(data)) {
                items.innerHTML = data.map(item =>
                    typeof item === "object" ? JSON.stringify(item) : item
                ).join("<br>");
            } else {
                items.innerHTML = xhr.responseText;
            }
            
            // data.forEach(item => {
            //     const texto = typeof item === "object" ? JSON.stringify(item) : item;
            //     items.innerHTML += texto + "<br>";
            // });
        }
    };

    xhr.send();
}

function SaveData() {
    uploadRequest('/saveItems');
}

function DeleteData() {
    uploadRequest('/deleteItems');
}

function UpdateData() {
    uploadRequest('/updateItems');
}

function uploadRequest(url)
{
    const v1 = document.getElementById("Informacao1").value.trim();
    const v2 = document.getElementById("Informacao2").value.trim();
    if (!v1 || !v2) return alert("Preencha os campos!");

    const xhr = new XMLHttpRequest();
    const params = `info1=${encodeURIComponent(v1)}&info2=${encodeURIComponent(v2)}`;
    xhr.open("POST", url, true);
    xhr.onload = () => fetchItems();
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send(params);
}

setInterval(fetchItems, 5000);
window.onload = fetchItems;